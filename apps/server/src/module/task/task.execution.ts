import { existsSync } from 'node:fs'

import { loadConfig } from '#/config'
import { removeComfyImage } from '#/lib/comfy/comfy.output'
import { buildComfyPrompt, txt2imgRuntime } from '#/lib/comfy/comfy.prompt'
import { absolutePath } from '#/lib/image/image.store'
import { imageCleanup } from '#/module/image/image.cleanup'
import { withImageMutation } from '#/module/image/image.mutation'
import { imageService } from '#/module/image/image.service'
import { taskImageService } from '#/module/task/task.image.service'
import { taskService } from '#/module/task/task.service'

import type { Database, UUID } from '@silent-pix/db'
import type { PublishEvent } from '#/app.store'
import type { ComfyClient } from '#/lib/comfy/comfy.client'
import type { WorkflowModel } from '#/module/workflow/workflow.model'

const config = loadConfig()

export const taskExecution = {
    async generate(
        database: Database,
        client: ComfyClient,
        taskId: UUID,
        workflow: WorkflowModel,
        publishEvent: PublishEvent,
    ): Promise<void> {
        try {
            const item = await taskService.findTask(database, taskId, {
                includeImage: true,
            })

            if (!item) return

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
                        publishEvent,
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

            client.execute(prompt, {
                async onAccepted(promptId) {
                    try {
                        await taskService.updateTask(
                            database,
                            {
                                id: taskId,
                                comfyPromptId: promptId,
                            },
                        )
                    }
                    catch (error) {
                        logCallbackError(taskId, 'onAccepted', error)
                    }
                },
                async onRunning() {
                    try {
                        const updated = await taskService.updateTask(
                            database,
                            {
                                id: taskId,
                                status: 'running',
                            },
                            { matchStatuses: ['queued'] },
                        )
                        if (!updated) return

                        const task = await taskService.snapshot(database, taskId)
                        if (task) {
                            publishEvent('task.changed', { task })
                        }
                    }
                    catch (error) {
                        logCallbackError(taskId, 'onRunning', error)
                    }
                },
                async onCompleted(result) {
                    try {
                        const outputImages = Object.values(result.outputs)
                            .flatMap(output => output.images ?? [])

                        if (!outputImages.length) {
                            await failTask(
                                database,
                                taskId,
                                'COMFY_OUTPUT_MISSING',
                                'ComfyUI did not return any output images.',
                                publishEvent,
                            )
                            return
                        }

                        const downloaded = await Promise.all(
                            outputImages.map(async (image, index) => ({
                                image,
                                index,
                                bytes: await client.downloadImage(image),
                            })),
                        )
                        const outputs: { imageId: UUID, sortIndex: number }[] = []
                        let storageError: string | undefined
                        let completion: CompletionResult = 'inactive'

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

                                    outputs.push({
                                        imageId: ingested.data.image.id,
                                        sortIndex: index,
                                    })
                                    if (ingested.data.created) {
                                        ingestedImageIds.push(ingested.data.image.id)
                                    }
                                }

                                completion = await completeTaskMutation(database, taskId, outputs)
                                if (completion !== 'completed') {
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
                                publishEvent,
                            )
                            return
                        }

                        if (completion === 'inactive') return

                        if (completion === 'completed') {
                            const task = await taskService.snapshot(database, taskId)
                            if (task) {
                                publishEvent('task.changed', { task })
                            }

                            /* Comfy output cleanup does not hold the image lock. */
                            for (const { image } of downloaded) {
                                await removeComfyImage(image)
                            }
                        }

                        /* A disappeared task has no durable history owner either. */
                        await deleteComfyHistory(client, result.promptId, taskId)
                    }
                    catch (error) {
                        await collapseGenerationError(database, taskId, error, publishEvent)
                    }
                },
                async onFailed(error) {
                    try {
                        await failTask(
                            database,
                            taskId,
                            error.code,
                            error.message,
                            publishEvent,
                        )
                    }
                    catch (failureError) {
                        console.error(`Failed to mark task ${taskId} failed.`, failureError)
                    }
                },
            })
        }
        catch (error) {
            await collapseGenerationError(database, taskId, error, publishEvent)
        }
    },
}

type CompletionResult = 'completed' | 'missing' | 'inactive'

async function failTask(
    database: Database,
    taskId: UUID,
    errorCode: string,
    errorMessage: string,
    publishEvent: PublishEvent,
): Promise<void> {
    const updated = await taskService.updateTask(
        database,
        {
            id: taskId,
            status: 'failed',
            errorCode,
            errorMessage,
        },
        { matchStatuses: ['queued', 'running'] },
    )
    if (!updated) return

    const task = await taskService.snapshot(database, taskId)
    if (task) {
        publishEvent('task.changed', { task })
    }
}

async function collapseGenerationError(
    database: Database,
    taskId: UUID,
    error: unknown,
    publishEvent: PublishEvent,
): Promise<void> {
    const message = error instanceof Error
        ? error.message
        : 'An unexpected task generation error occurred.'

    console.error(`Task ${taskId} generation callback failed.`, error)
    try {
        await failTask(
            database,
            taskId,
            'TASK_GENERATE_ERROR',
            message,
            publishEvent,
        )
    }
    catch (failureError) {
        console.error(`Failed to mark task ${taskId} generation error.`, failureError)
    }
}

function logCallbackError(taskId: UUID, callback: string, error: unknown): void {
    console.error(`Task ${taskId} ${callback} callback failed.`, error)
}

async function deleteComfyHistory(
    client: ComfyClient,
    promptId: string,
    taskId: UUID,
): Promise<void> {
    try {
        await client.deleteHistory(promptId)
    }
    catch (error) {
        console.error(`Failed to remove Comfy history for task ${taskId}.`, error)
    }
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
    database: Database,
    taskId: UUID,
    outputs: { imageId: UUID, sortIndex: number }[],
): Promise<CompletionResult> {
    let completed = false

    await database.transaction(async tx => {
        const updated = await taskService.updateTask(
            tx,
            {
                id: taskId,
                status: 'done',
                errorCode: null,
                errorMessage: null,
            },
            { matchStatuses: ['queued', 'running'] },
        )
        if (!updated) return

        await taskImageService.addReferences(
            tx,
            outputs.map(output => ({
                taskId,
                imageId: output.imageId,
                type: 'output',
                sortIndex: output.sortIndex,
            })),
        )
        completed = true
    })

    if (completed) return 'completed'
    return await taskService.findTask(database, taskId) ? 'inactive' : 'missing'
}
