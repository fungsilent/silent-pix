import { existsSync } from 'node:fs'

import { loadConfig } from '#/config'
import { ComfyError } from '#/lib/comfy/comfy.client'
import { removeComfyImage } from '#/lib/comfy/comfy.output'
import { buildComfyPrompt, txt2imgRuntime } from '#/lib/comfy/comfy.prompt'
import { absolutePath } from '#/lib/image/image.store'
import { imageCleanup } from '#/module/image/image.cleanup'
import { withImageMutation } from '#/module/image/image.mutation'
import { imageService } from '#/module/image/image.service'
import { taskImageService } from '#/module/task/task.image.service'
import { taskService } from '#/module/task/task.service'

import type { DatabaseClient, UUID } from '@silent-pix/db'
import type { PushEvent } from '#/app.store'
import type { ComfyClient } from '#/lib/comfy/comfy.client'
import type { WorkflowModel } from '#/module/workflow/workflow.model'

const config = loadConfig()

export const taskExecution = {
    async generate(
        database: DatabaseClient,
        client: ComfyClient,
        taskId: UUID,
        workflow: WorkflowModel,
        pushEvent: PushEvent,
    ): Promise<void> {
        const item = await taskService.findTask(database, taskId, {
            includeImage: true,
        })

        if (!item) {
            return
        }

        try {
            const input = item.images.find(relation => relation.type === 'input')
            let runtime = txt2imgRuntime

            if (input) {
                /* 使用 image path 才為圖片輸入，先確認檔案是否存在 */
                if (!existsSync(absolutePath(input.image.path))) {
                    await failTask(
                        database,
                        taskId,
                        'REFERENCE_IMAGE_FILE_MISSING',
                        'Reference image file is missing from storage.',
                        pushEvent,
                    )
                    return
                }

                runtime = {
                    initImagePath: comfyImagePath(input.image.path),
                }
            }

            const prompt = buildComfyPrompt(
                workflow.graph,
                workflow.configSchema,
                item.task.config,
                runtime,
            )
            const result = await client.execute(prompt, {
                async onPromptCreated(promptId) {
                    await taskService.updateTask(database, {
                        id: taskId,
                        comfyPromptId: promptId,
                    })
                },
                async onRunning() {
                    await taskService.updateTask(
                        database,
                        {
                            id: taskId,
                            status: 'running',
                        },
                        {
                            matchStatuses: ['queued']
                        })
                    await taskService.publishChanged(database, taskId, pushEvent)
                },
            })
            const outputImages = Object.values(result.history.outputs ?? {})
                .flatMap(output => output.images ?? [])

            if (!outputImages.length) {
                await failTask(
                    database,
                    taskId,
                    'COMFY_OUTPUT_MISSING',
                    'ComfyUI did not return any output images.',
                    pushEvent,
                )
                return
            }

            const outputs: { imageId: UUID, sortIndex: number }[] = []

            const downloaded = await Promise.all(
                outputImages.map(async (image, index) => ({
                    image,
                    index,
                    bytes: await client.downloadImage(image),
                })),
            )

            let storageError: string | undefined
            let completed = false

            await withImageMutation(async () => {
                const ingestedImageIds: UUID[] = []
                const cleanupIngestedImages = async () => {
                    if (ingestedImageIds.length === 0) return

                    const imageIds = ingestedImageIds.splice(0)
                    await imageCleanup.removeUnreferenced(database, imageIds)
                }

                try {
                    for (const { index, bytes } of downloaded) {
                        const ingested = await imageService.ingest(database, bytes)

                        if (!ingested.ok) {
                            storageError = ingested.error
                            await cleanupIngestedImages()
                            return
                        }

                        outputs.push({ imageId: ingested.data.image.id, sortIndex: index })
                        if (ingested.data.created) {
                            ingestedImageIds.push(ingested.data.image.id)
                        }
                    }

                    completed = await completeTaskMutation(database, taskId, outputs)
                    if (!completed) {
                        await cleanupIngestedImages()
                    }
                }
                catch (error) {
                    await cleanupIngestedImages()
                    throw error
                }
            })

            if (storageError) {
                await failTask(
                    database,
                    taskId,
                    storageError,
                    'ComfyUI output could not be stored.',
                    pushEvent,
                )
                return
            }

            if (completed) {
                await taskService.publishChanged(database, taskId, pushEvent)

                /* Comfy output cleanup and history deletion do not hold the image lock. */
                for (const { image } of downloaded) {
                    await removeComfyImage(image)
                }
            }

            try {
                await client.deleteHistory(result.promptId)
            }
            catch (error) {
                console.error(`Failed to remove Comfy history for task ${taskId}.`, error)
            }
        }
        catch (error) {
            console.error(`Task ${taskId} generation failed.`, error)

            /*
             * ingest/complete 失敗時，剛由本次操作建立的孤兒已在同一把 lock 內清理。
             * 這裡不再碰 image rows；內容定址下既有檔案可能被別的 task 引用，孤兒交給
             * server-owned image GC（`pnpm image:gc`）。
             */
            const code = error instanceof ComfyError
                ? error.code
                : 'TASK_GENERATE_ERROR'
            const message = error instanceof Error
                ? error.message
                : 'An unexpected task generation error occurred.'

            await failTask(database, taskId, code, message, pushEvent)
        }
    },
}

async function failTask(
    database: DatabaseClient,
    taskId: UUID,
    errorCode: string,
    errorMessage: string,
    pushEvent: PushEvent,
): Promise<void> {
    await taskService.updateTask(
        database,
        {
            id: taskId,
            status: 'failed',
            errorCode,
            errorMessage,
        },
        {
            matchStatuses: ['queued', 'running'],
        })
    await taskService.publishChanged(database, taskId, pushEvent)
}

/*
 * 把 images.path 這個 posix 相對路徑轉成 ComfyUI 那一側的絕對路徑。
 * prefix 含反斜線就當它是 Windows 路徑，分隔符跟著換。
 */
function comfyImagePath(relativePath: string): string {
    const prefix = config.comfyuiStoragePrefix
    const separator = prefix.includes('\\') ? '\\' : '/'
    const trimmed = prefix.replace(/[\\/]+$/, '')

    return `${trimmed}${separator}${relativePath.split('/').join(separator)}`
}

/* Caller owns the image mutation lock; event publication belongs outside it. */
async function completeTaskMutation(
    database: DatabaseClient,
    taskId: UUID,
    outputs: { imageId: UUID, sortIndex: number }[],
): Promise<boolean> {
    const item = await taskService.findTask(database, taskId)
    if (!item) {
        return false
    }

    await database.db.transaction(async tx => {
        await taskImageService.addReferences(
            tx,
            outputs.map(output => ({
                taskId,
                imageId: output.imageId,
                type: 'output',
                sortIndex: output.sortIndex,
            })),
        )

        await taskService.updateTask(tx, {
            id: taskId,
            status: 'done',
            errorCode: null,
            errorMessage: null,
        })
    })

    return true
}
