import { existsSync } from 'node:fs'

import { loadConfig } from '#/config'
import {
    type ComfyClient,
    ComfyError,
    type ComfyImage,
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
        const failTask = async (error: unknown): Promise<void> => {
            await publishChanged(await taskExecution.onFailed(database, taskId, error))
        }

        let prompt: ReturnType<typeof taskExecution.buildPrompt>
        try {
            const item = await taskService.findTask(database, taskId, {
                includeImage: true,
            })

            if (!item) return

            prompt = taskExecution.buildPrompt(item.task, item.images, workflow)
        }
        catch (error) {
            await failTask(error)
            return
        }

        if (!prompt.ok) {
            await failTask(prompt.error)
            return
        }

        const callbacks: ExecuteCallbacks = {
            onAccepted: promptId => taskExecution.onAccepted(database, taskId, promptId),
            onRunning: async () => {
                await publishChanged(await taskExecution.onRunning(database, taskId))
            },
            onCompleted: async result => {
                const outputImages = Object.values(result.outputs)
                    .flatMap(output => output.images ?? [])

                let stored
                try {
                    stored = await taskExecution.onCompleted(database, client, taskId, outputImages)
                }
                catch (error) {
                    await failTask(error)
                    return
                }

                if (!stored.ok) {
                    await failTask(stored.error)
                    return
                }

                switch (stored.data) {
                    case 'inactive':
                        return
                    case 'missing':
                        break
                    case 'completed':
                        await publishChanged(true)
                        // ComfyClient logs cleanup rejections without changing the committed Task outcome.
                        for (const image of outputImages) {
                            await removeComfyImage(image)
                        }
                        break
                }

                await client.deleteHistory(result.promptId)
            },
            onFailed: failTask,
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
            const path = absolutePath(input.image.path)
            if (!existsSync(path)) {
                return fail('REFERENCE_IMAGE_FILE_MISSING')
            }

            runtime = {
                initImagePath: comfyReferencePath(input.image.path),
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
        outputImages: ComfyImage[],
    ) {
        if (!outputImages.length) {
            return fail('COMFY_OUTPUT_MISSING')
        }

        const downloaded = await Promise.all(
            outputImages.map(async (image, index) => ({
                index,
                bytes: await client.downloadImage(image),
            })),
        )

        return withImageMutation(async () => {
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

function comfyReferencePath(relativePath: string): string {
    // ComfyUI may run on Windows while Server runs in WSL.
    const directory = config.comfyuiReferenceDir
    const separator = directory.includes('\\') ? '\\' : '/'
    const trimmed = directory.replace(/[\\/]+$/, '')

    return `${trimmed}${separator}${relativePath.split('/').join(separator)}`
}
