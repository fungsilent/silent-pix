import { existsSync } from 'node:fs'

import {
    images,
    taskImages,
    tasks,
    toUUID,
} from '@silent-pix/db'
import { and, asc, desc, eq, inArray } from 'drizzle-orm'

import { loadConfig } from '#/config'
import { ComfyError } from '#/lib/comfy/comfy.client'
import { removeComfyImage } from '#/lib/comfy/comfy.output'
import { buildComfyPrompt, resolveSeed, txt2imgRuntime } from '#/lib/comfy/comfy.prompt'
import { absolutePath } from '#/lib/image/image.store'
import { done, fail } from '#/lib/service-result'
import { toImageResource } from '#/module/image/image.model'
import { imageService } from '#/module/image/image.service'
import { comfyImagePath } from '#/module/image/image.util'
import { taskChanged } from '#/module/task/task.event'
import { castTaskModel } from '#/module/task/task.model'
import { workflowService } from '#/module/workflow/workflow.service'

import type { DatabaseClient, TaskStatus, TaskUpdate, UUID } from '@silent-pix/db'
import type { ImageApi, TaskApi } from '@silent-pix/shared'
import type { PushEvent } from '#/app.store'
import type { ComfyClient } from '#/lib/comfy/comfy.client'
import type { GenerateConfig } from '#/lib/comfy/comfy.prompt'
import type { TaskImageModel, TaskModel } from '#/module/task/task.model'
import type { WorkflowModel } from '#/module/workflow/workflow.model'

const config = loadConfig()

type TaskCursor = { createdAt: string, id: string }

export const taskService = {
    // MARK: CRUD
    async findTask<HasWorkflow extends boolean = false, HasImages extends boolean = false>(
        database: DatabaseClient,
        taskId: UUID,
        options?: {
            includeWorkflow?: HasWorkflow,
            includeImage?: HasImages,
        }
    ): Promise<undefined | {
        task: TaskModel
        workflow: HasWorkflow extends true ? WorkflowModel : never
        images: HasImages extends true ? TaskImageModel[] : never
    }> {
        const { includeWorkflow, includeImage } = options || {}
        const [task] = await database.db
            .select()
            .from(tasks)
            .where(eq(tasks.id, taskId))

        if (!task) return undefined

        let workflow: WorkflowModel | undefined = undefined
        if (includeWorkflow) {
            const _workflow = await workflowService.findWorkflow(database, task.workflowId)
            if (!_workflow) {
                return undefined
            }
            workflow = _workflow
        }

        let taskImageModels: TaskImageModel[] | undefined = undefined
        if (includeImage) {
            const rows = await database.db
                .select({ relation: taskImages, image: images })
                .from(taskImages)
                .innerJoin(images, eq(images.id, taskImages.imageId))
                .where(eq(taskImages.taskId, task.id))
                .orderBy(asc(taskImages.type), asc(taskImages.sortIndex))

            taskImageModels = rows.map(row => ({ ...row.relation, image: row.image }))
        }

        return {
            task: castTaskModel(task),
            workflow: workflow as HasWorkflow extends true ? WorkflowModel : never,
            images: taskImageModels as HasImages extends true ? TaskImageModel[] : never,
        }
    },

    async getTaskResponse(
        database: DatabaseClient,
        taskId: UUID,
    ): Promise<TaskApi.GetTaskResponse | undefined> {
        const item = await taskService.findTask(database, taskId, {
            includeWorkflow: true,
            includeImage: true,
        })

        if (!item) {
            return undefined
        }

        const referenceImage = item.images.find(relation => relation.type === 'input')
        const referenceOrigin = referenceImage
            ? await imageService.findOrigin(database, referenceImage.imageId, taskId)
            : undefined

        return {
            id: item.task.id,
            name: item.task.name,
            status: item.task.status,
            createdAt: item.task.createdAt.toISOString(),
            workflowId: item.task.workflowId,
            workflow: item.workflow.name,
            config: item.task.config.config,
            lora: item.task.config.lora,
            prompt: item.task.config.prompt,
            images: toOutputResources(item.images),
            referenceImage: referenceImage
                ? { image: toImageResource(referenceImage.image), origin: referenceOrigin ?? null }
                : null,
        }
    },

    async updateTask(
        database: DatabaseClient,
        task: TaskUpdate,
        options?: {
            limtedStatus?: TaskStatus[],
        }
    ) {
        const { limtedStatus } = options || {}
        const { id, ...data } = task
        return await database.db
            .update(tasks)
            .set({
                ...data,
                updatedAt: Date.now()
            })
            .where(and(
                eq(tasks.id, id),
                limtedStatus
                    ? inArray(tasks.status, limtedStatus)
                    : undefined
            ))
            .returning()
    },

    // MARK: Service
    async create(database: DatabaseClient, request: TaskApi.CreateTaskRequest) {
        const { payload } = request
        const workflowId = toUUID(payload.workflowId, 'workflowId')
        const workflow = await workflowService.findWorkflow(database, workflowId)

        if (!workflow) return fail('WORKFLOW_NOT_FOUND')

        let inputImage: ImageApi.ImageResource | undefined
        let inputImageId: UUID | undefined
        let ingestedImageId: UUID | undefined

        if (payload.referenceImageId) {
            // img2img: task output image
            const existing = await imageService.findImage(
                database,
                toUUID(payload.referenceImageId, 'referenceImageId'),
            )
            if (!existing) return fail('REFERENCE_IMAGE_NOT_FOUND')

            inputImageId = existing.id
            inputImage = toImageResource(existing)
        }
        else if (request.referenceImage) {
            // img2img: upload image
            const imageBytes = new Uint8Array(await request.referenceImage.arrayBuffer())
            const ingested = await imageService.ingest(database, imageBytes)
            if (!ingested.ok) return fail(ingested.error)

            inputImageId = ingested.data.image.id
            inputImage = toImageResource(ingested.data.image)
            if (ingested.data.created) {
                ingestedImageId = ingested.data.image.id
            }
        }

        const createdAt = Date.now()
        const generateConfig: GenerateConfig = {
            config: {
                ...payload.config,
                seed: resolveSeed(payload.config.seed),
                ...(inputImage
                    ? {
                        width: inputImage.width,
                        height: inputImage.height,
                        /* latent 來自 VAEEncode，EmptyLatentImage.batch_size 在死分支上 */
                        batch: 1,
                    }
                    : { denoise: 1 }),
            },
            lora: payload.lora,
            prompt: payload.prompt,
        }

        try {
            const createdTask = await database.db.transaction(async transaction => {
                const [inserted] = await transaction
                    .insert(tasks)
                    .values({
                        name: payload.name || null,
                        status: 'queued',
                        workflowId,
                        config: generateConfig,
                        createdAt,
                        updatedAt: createdAt,
                    })
                    .returning()

                if (!inserted) {
                    throw new Error('Task insert returned no row.')
                }

                if (inputImageId) {
                    await transaction
                        .insert(taskImages)
                        .values({
                            taskId: inserted.id,
                            imageId: inputImageId,
                            type: 'input',
                            sortIndex: 0,
                            createdAt,
                        })
                }

                return inserted
            })

            return done(castTaskModel(createdTask))
        }
        catch (error) {
            console.error('Task create failed.', error)

            if (ingestedImageId) {
                await imageService.deleteUnreferenced(database, [ingestedImageId])
            }

            return fail('CREATE_TASK_FAIL')
        }
    },

    async remove(database: DatabaseClient, taskId: UUID) {
        const related = await database.db
            .select({ imageId: taskImages.imageId })
            .from(taskImages)
            .where(eq(taskImages.taskId, taskId))
            .all()

        const [removed] = await database.db
            .delete(tasks)
            .where(eq(tasks.id, taskId))
            .returning({ id: tasks.id })

        if (!removed) return fail('TASK_NOT_FOUND')

        await imageService.deleteUnreferenced(
            database,
            [...new Set(related.map(relation => relation.imageId))],
        )

        return done({ id: removed.id })
    },

    async getTasks(
        database: DatabaseClient,
        query: TaskApi.GetTasksQuery,
    ) {
        const rows = await database.db
            .select()
            .from(tasks)
            .orderBy(desc(tasks.createdAt), desc(tasks.id))
            .then(r => r.map(task => castTaskModel(task)))

        let start = 0

        if (query.cursor) {
            const cursor = decodeCursor(query.cursor)
            if (!cursor) return fail('INVALID_TASK_CURSOR')

            const cursorIndex = rows.findIndex(row => (
                row.createdAt.toISOString() === cursor.createdAt && row.id === cursor.id
            ))
            if (cursorIndex < 0) return fail('INVALID_TASK_CURSOR')
            start = cursorIndex + 1
        }

        const selected = rows.slice(start, start + query.limit)
        const taskIds = selected.map(task => task.id)
        const thumbnailRows = taskIds.length === 0
            ? []
            : await database.db
                .select({
                    taskId: taskImages.taskId,
                    sortIndex: taskImages.sortIndex,
                    imageId: taskImages.imageId,
                })
                .from(taskImages)
                .where(and(
                    inArray(taskImages.taskId, taskIds),
                    eq(taskImages.type, 'output'),
                ))
                .orderBy(asc(taskImages.sortIndex))
                .all()

        const firstImage = new Map<string, string>()
        for (const row of thumbnailRows) {
            if (!firstImage.has(row.taskId)) firstImage.set(row.taskId, row.imageId)
        }

        const items = selected.map(row => {
            const imageId = firstImage.get(row.id)
            return {
                id: row.id,
                name: row.name,
                status: row.status,
                createdAt: row.createdAt.toISOString(),
                ...(imageId ? { thumbnail: `/api/image/${imageId}` } : {}),
            }
        })
        const lastItem = items.at(-1)

        return done({
            items,
            ...(lastItem && start + items.length < rows.length
                ? { nextCursor: encodeCursor(lastItem) }
                : {}),
        })
    },

    async snapshot(
        database: DatabaseClient,
        taskId: UUID,
    ) {
        const item = await taskService.findTask(database, taskId, { includeImage: true })

        if (!item) {
            return undefined
        }

        return {
            id: item.task.id,
            name: item.task.name,
            status: item.task.status,
            createdAt: item.task.createdAt.toISOString(),
            images: toOutputResources(item.images),
        }
    },

    async publishChanged(
        database: DatabaseClient,
        taskId: UUID,
        pushEvent: PushEvent,
    ): Promise<void> {
        const snapshot = await taskService.snapshot(database, taskId)

        if (!snapshot) {
            return
        }

        pushEvent(taskChanged(snapshot))
    },

    async generate(
        database: DatabaseClient,
        client: ComfyClient,
        taskId: UUID,
        pushEvent: PushEvent,
    ) {
        const item = await taskService.findTask(database, taskId, {
            includeWorkflow: true,
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
                if (!existsSync(absolutePath(config.appStorageDir, input.image.path))) {
                    await taskService.fail(
                        database,
                        taskId,
                        'REFERENCE_IMAGE_FILE_MISSING',
                        'Reference image file is missing from storage.',
                        pushEvent,
                    )
                    return
                }

                runtime = {
                    initImagePath: comfyImagePath(config.comfyuiStoragePrefix, input.image.path),
                }
            }

            const prompt = buildComfyPrompt(
                item.workflow.graph,
                item.workflow.configSchema,
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
                            limtedStatus: ['queued']
                        })
                    await taskService.publishChanged(database, taskId, pushEvent)
                },
            })
            const outputImages = Object.values(result.history.outputs ?? {})
                .flatMap(output => output.images ?? [])

            if (!outputImages.length) {
                await taskService.fail(
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

            for (const { image, index, bytes } of downloaded) {
                const ingested = await imageService.ingest(database, bytes)

                if (!ingested.ok) {
                    await taskService.fail(
                        database,
                        taskId,
                        ingested.error,
                        'ComfyUI output could not be stored.',
                        pushEvent,
                    )
                    return
                }

                outputs.push({ imageId: ingested.data.image.id, sortIndex: index })

                await removeComfyImage(config.comfyuiOutputDir, image)
            }

            await taskService.complete(database, taskId, outputs, pushEvent)

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
             * 錯誤路徑不 unlink 任何東西。內容定址下剛「寫入」的檔案很可能是別的
             * task 正在引用的既有檔案，刪掉就是刪掉活的圖。孤兒交給 db:gc。
             */
            const code = error instanceof ComfyError
                ? error.code
                : 'TASK_GENERATE_ERROR'
            const message = error instanceof Error
                ? error.message
                : 'An unexpected task generation error occurred.'

            await taskService.fail(database, taskId, code, message, pushEvent)
        }
    },

    async complete(
        database: DatabaseClient,
        taskId: UUID,
        outputs: { imageId: UUID, sortIndex: number }[],
        pushEvent: PushEvent,
    ) {
        const item = await taskService.findTask(database, taskId)
        if (!item) {
            return
        }

        const createdAt = Date.now()

        await database.db.transaction(async tx => {
            if (outputs.length) {
                await tx
                    .insert(taskImages)
                    .values(outputs.map(output => ({
                        taskId,
                        imageId: output.imageId,
                        type: 'output' as const,
                        sortIndex: output.sortIndex,
                        createdAt,
                    })))
                    .run()
            }

            await tx.update(tasks)
                .set({
                    status: 'done',
                    updatedAt: Date.now(),
                    errorCode: null,
                    errorMessage: null,
                })
                .where(eq(tasks.id, taskId))
                .run()
        })

        await taskService.publishChanged(database, taskId, pushEvent)
    },

    async fail(
        database: DatabaseClient,
        taskId: UUID,
        errorCode: string,
        errorMessage: string,
        pushEvent: PushEvent,
    ) {
        await taskService.updateTask(
            database,
            {
                id: taskId,
                status: 'failed',
                errorCode,
                errorMessage,
            },
            {
                limtedStatus: ['queued', 'running'],
            })
        await taskService.publishChanged(database, taskId, pushEvent)
    },

    // MARK: Option
    async samplerList(comfyClient: ComfyClient) {
        const comfySamplers = new Set(await comfyClient.getSamplerNames())
        const allowSamplers = new Set([
            'er_sde',
            'euler_a',
            'dpmpp_2m_sde_gpu',
            'euler'
        ])
        const availableSamplers = [...allowSamplers]
            .filter(sampler => comfySamplers.has(sampler))
            .map(sampler => ({
                label: sampler,
                value: sampler,
            }))
        return availableSamplers
    },

    async loraList(comfyClient: ComfyClient) {
        const names = [...new Set(await comfyClient.getLoraNames())]
            .sort((left, right) => left < right ? -1 : left > right ? 1 : 0)

        return names.map(name => ({
            label: name,
            value: name,
        }))
    },
}

/* 只有 output 進畫廊；輸入圖是另一個欄位，混進來會出現在縮圖與 viewer 裡 */
function toOutputResources(relations: TaskImageModel[]): ImageApi.ImageResource[] {
    return relations
        .filter(relation => relation.type === 'output')
        .sort((left, right) => left.sortIndex - right.sortIndex)
        .map(relation => toImageResource(relation.image))
}

function isTaskCursor(value: unknown): value is TaskCursor {
    if (!value || typeof value !== 'object') return false
    const cursor = value as Record<string, unknown>
    return typeof cursor.createdAt === 'string'
        && !Number.isNaN(Date.parse(cursor.createdAt))
        && typeof cursor.id === 'string'
}

function encodeCursor(task: TaskApi.TaskListItem): string {
    return Buffer.from(JSON.stringify({
        createdAt: task.createdAt,
        id: task.id,
    }), 'utf8').toString('base64url')
}

function decodeCursor(value: string): TaskCursor | undefined {
    try {
        const parsed = JSON.parse(Buffer.from(value, 'base64url').toString('utf8')) as unknown
        return isTaskCursor(parsed) ? parsed : undefined
    }
    catch {
        return undefined
    }
}
