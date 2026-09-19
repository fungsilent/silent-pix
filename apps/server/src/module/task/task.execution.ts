import { existsSync } from 'node:fs'

import { loadConfig } from '#/config'
import {
    type ComfyClient,
    ComfyError,
    type ExecuteCallbacks,
} from '#/lib/comfy/comfy.client'
import { removeComfyImage } from '#/lib/comfy/comfy.output'
import { buildComfyPrompt, txt2imgRuntime } from '#/lib/comfy/comfy.prompt'
import { absolutePath } from '#/lib/image/image.store'
import { done, fail } from '#/lib/service-result'
import { imageCleanup } from '#/module/image/image.cleanup'
import { withImageMutation } from '#/module/image/image.mutation'
import { imageService } from '#/module/image/image.service'
import { taskImageService } from '#/module/task/task.image.service'
import { taskService } from '#/module/task/task.service'

import type { Database, UUID } from '@silent-pix/db'
import type { PublishEvent } from '#/app.store'
import type { TaskImageModel, TaskModel } from '#/module/task/task.model'
import type { WorkflowModel } from '#/module/workflow/workflow.model'

const config = loadConfig()

type CompletionResult = 'completed' | 'missing' | 'inactive'

export const taskExecution = {
    async generate(
        database: Database,
        client: ComfyClient,
        taskId: UUID,
        workflow: WorkflowModel,
        publishEvent: PublishEvent,
    ): Promise<void> {
        const publishChanged = async (changed: boolean): Promise<void> => {
            if (!changed) return

            const task = await taskService.snapshot(database, taskId)
            if (task) {
                publishEvent('task.changed', { task })
            }
        }

        const item = await taskService.findTask(database, taskId, {
            includeImage: true,
        })

        if (!item) return

        const prompt = taskExecution.buildPrompt(item.task, item.images, workflow)
        if (!prompt.ok) {
            await taskExecution.onFailed(database, taskId, prompt.error)
            return
        }

        const callbacks: ExecuteCallbacks = {
            onAccepted: promptId => taskExecution.onAccepted(database, taskId, promptId),
            onRunning: async () => await publishChanged(
                await taskExecution.onRunning(database, taskId),
            ),
            onCompleted: async result => await publishChanged(
                await taskExecution.onCompleted(database, client, taskId, result),
            ),
            onFailed: async error => await publishChanged(
                await taskExecution.onFailed(database, taskId, error),
            ),
        }

        client.execute(prompt.data, callbacks)
    },

    buildPrompt(
        task: TaskModel,
        taskImages: TaskImageModel[],
        workflow: WorkflowModel,
    ) {
        let runtime = txt2imgRuntime
        const input = taskImages.find(relation => relation.type === 'input')
        if (input) {
            if (!existsSync(absolutePath(input.image.path))) {
                return fail('REFERENCE_IMAGE_FILE_MISSING')
            }

            runtime = {
                initImagePath: comfyImagePath(input.image.path),
            }
        }

        return done(buildComfyPrompt(
            workflow.graph,
            workflow.configSchema,
            task.config,
            runtime,
        ))
    },

    async onAccepted(
        database: Database,
        taskId: UUID,
        promptId: Parameters<NonNullable<ExecuteCallbacks['onAccepted']>>[0],
    ): Promise<void> {
        await taskService.updateTask(
            database,
            {
                id: taskId,
                comfyPromptId: promptId,
            },
        )
    },

    async onRunning(
        database: Database,
        taskId: UUID,
    ): Promise<boolean> {
        const updated = await taskService.updateTask(
            database,
            {
                id: taskId,
                status: 'running',
            },
            { matchStatuses: ['queued'] },
        )
        return !!updated
    },

    async onCompleted(
        database: Database,
        client: ComfyClient,
        taskId: UUID,
        result: Parameters<ExecuteCallbacks['onCompleted']>[0],
    ): Promise<boolean> {
        try {
            const outputImages = Object.values(result.outputs)
                .flatMap(output => output.images ?? [])

            if (!outputImages.length) {
                return await taskExecution.onFailed(database, taskId, 'COMFY_OUTPUT_MISSING')
            }

            const downloaded = await Promise.all(
                outputImages.map(async (image, index) => ({
                    index,
                    bytes: await client.downloadImage(image),
                })),
            )

            const stored = await withImageMutation(async () => {
                const outputs: { imageId: UUID, sortIndex: number }[] = []
                const ingestedImageIds: UUID[] = []
                let referencesCommitted = false

                try {
                    for (const { index, bytes } of downloaded) {
                        const ingested = await imageService.ingest(database, bytes)

                        if (!ingested.ok) {
                            return fail(ingested.error)
                        }

                        outputs.push({
                            imageId: ingested.data.image.id,
                            sortIndex: index,
                        })
                        if (ingested.data.created) {
                            ingestedImageIds.push(ingested.data.image.id)
                        }
                    }

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
                        referencesCommitted = true
                    })

                    if (referencesCommitted) {
                        return done<CompletionResult>('completed')
                    }

                    const taskExists = !!(await taskService.findTask(database, taskId))
                    return done<CompletionResult>(taskExists ? 'inactive' : 'missing')
                }
                finally {
                    if (!referencesCommitted && ingestedImageIds.length > 0) {
                        await imageCleanup.removeUnreferenced(database, ingestedImageIds)
                    }
                }
            })

            if (!stored.ok) {
                return await taskExecution.onFailed(database, taskId, stored.error)
            }

            switch (stored.data) {
                case 'inactive':
                    return false
                case 'missing':
                    /* A disappeared task has no durable history owner either. */
                    await client.deleteHistory(result.promptId)
                    return false
                case 'completed':
                    /* Comfy output cleanup does not hold the image lock. */
                    for (const image of outputImages) {
                        await removeComfyImage(image)
                    }

                    await client.deleteHistory(result.promptId)
                    return true
            }
        }
        catch (error) {
            return await taskExecution.onFailed(database, taskId, error)
        }
    },

    async onFailed(
        database: Database,
        taskId: UUID,
        error: unknown,
    ): Promise<boolean> {
        console.error(`Task ${taskId} generation failed.`, error)

        const parsedError = taskExecution.parseExecutionError(error)
        const updated = await taskService.updateTask(
            database,
            {
                id: taskId,
                status: 'failed',
                errorCode: parsedError.code,
                errorMessage: parsedError.message,
            },
            { matchStatuses: ['queued', 'running'] },
        )
        return !!updated
    },

    parseExecutionError(error: unknown) {
        if (error instanceof ComfyError) {
            return {
                code: error.code,
                message: error.message,
            }
        }

        if (error instanceof Error) {
            return {
                code: 'TASK_GENERATE_ERROR',
                message: error.message,
            }
        }

        if (
            error
            && typeof error === 'string'
            && isFailureKey(error)
        ) {
            return {
                code: error,
                message: executionFailures[error].message,
            }
        }

        return {
            code: 'TASK_GENERATE_ERROR',
            message: 'An unexpected task generation error occurred.',
        }
    },
}

const executionFailures = {
    REFERENCE_IMAGE_FILE_MISSING: { message: 'Reference image file is missing from storage.' },
    COMFY_OUTPUT_MISSING: { message: 'ComfyUI did not return any output images.' },
    IMAGE_EMPTY: { message: 'ComfyUI output could not be stored.' },
    IMAGE_UNSUPPORTED_TYPE: { message: 'ComfyUI output could not be stored.' },
    IMAGE_STORE_FAILED: { message: 'ComfyUI output could not be stored.' },
} satisfies Record<string, { message: string }>

function isFailureKey(key: string): key is keyof typeof executionFailures {
    return key in executionFailures
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
