import { existsSync } from 'node:fs'

import {
    images,
    taskImages,
    tasks,
    toUUID,
} from '@silent-pix/db'
import { and, asc, count, desc, eq, inArray, like, notInArray, or, sql } from 'drizzle-orm'
import { alias } from 'drizzle-orm/sqlite-core'

import { loadConfig } from '#/config'
import { ComfyError } from '#/lib/comfy/comfy.client'
import { removeComfyImage } from '#/lib/comfy/comfy.output'
import { buildComfyPrompt, resolveSeed, txt2imgRuntime } from '#/lib/comfy/comfy.prompt'
import { absolutePath } from '#/lib/image/image.store'
import { done, fail } from '#/lib/service-result'
import { toImageResource } from '#/module/image/image.model'
import { withImageMutation } from '#/module/image/image.mutation'
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

type TaskCursor = { createdAt: number, id: string }

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
            pin: item.task.pin,
            discard: item.task.discard,
            createdAt: item.task.createdAt.toISOString(),
            workflowId: item.task.workflowId,
            workflow: item.workflow.name,
            workflowRevision: item.task.workflowRevision,
            currentWorkflowRevision: item.workflow.revision,
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

        if (workflow.archivedAt !== null) return fail('WORKFLOW_ARCHIVED')

        return withImageMutation(async () => {
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
        })
    },

    async setFlags(
        database: DatabaseClient,
        request: TaskApi.UpdateTaskFlagsRequest,
    ) {
        const taskIds = request.taskIds.map(taskId => toUUID(taskId, 'taskId'))
        const flags = request.flag === 'pin'
            ? { pin: true, discard: false }
            : request.flag === 'discard'
                ? { pin: false, discard: true }
                : { pin: false, discard: false }
        const allTasksExist = eq(
            database.db.$count(tasks, inArray(tasks.id, taskIds)),
            taskIds.length,
        )
        const updated = await database.db
            .update(tasks)
            .set({ ...flags, updatedAt: Date.now() })
            .where(and(
                inArray(tasks.id, taskIds),
                allTasksExist,
            ))
            .returning({
                id: tasks.id,
                pin: tasks.pin,
                discard: tasks.discard,
            })

        if (updated.length !== taskIds.length) {
            return fail('TASK_NOT_FOUND')
        }

        return done({ tasks: updated })
    },

    async removeMany(
        database: DatabaseClient,
        request: TaskApi.DeleteTasksRequest,
        options?: { allowActive?: boolean },
    ) {
        const allowActive = options?.allowActive ?? false

        return withImageMutation(async () => {
            let removed: { ids: UUID[], imageIds: UUID[] }

            if (request.scope === 'selected') {
                const taskIds = request.taskIds.map(taskId => toUUID(taskId, 'taskId'))
                const targetsQuery = database.db
                    .select({ id: tasks.id, status: tasks.status })
                    .from(tasks)
                    .where(inArray(tasks.id, taskIds))
                const relatedQuery = database.db
                    .selectDistinct({ imageId: taskImages.imageId })
                    .from(taskImages)
                    .where(inArray(taskImages.taskId, taskIds))

                /* 驗證查詢與帶 guard 的刪除必須留在同一個 batch，才能維持全有全無。 */
                const allTargetsExist = sql`(
                SELECT count(*) FROM ${tasks}
                WHERE ${inArray(tasks.id, taskIds)}
            ) = ${taskIds.length}`
                const noActiveTargets = sql`NOT EXISTS (
                SELECT 1 FROM ${tasks}
                WHERE ${inArray(tasks.id, taskIds)}
                    AND ${or(eq(tasks.status, 'queued'), eq(tasks.status, 'running'))}
            )`
                const deleteCondition = allowActive
                    ? and(inArray(tasks.id, taskIds), allTargetsExist)
                    : and(inArray(tasks.id, taskIds), allTargetsExist, noActiveTargets)
                const deleteQuery = database.db
                    .delete(tasks)
                    .where(deleteCondition)

                const [targets, related, deleted] = await database.db.batch([
                    targetsQuery,
                    relatedQuery,
                    deleteQuery,
                ] as const)

                if (targets.length !== taskIds.length) {
                    return fail('TASK_NOT_FOUND')
                }

                if (!allowActive && targets.some(target => (
                    target.status === 'queued' || target.status === 'running'
                ))) {
                    return fail('TASK_ACTIVE')
                }

                if (deleted.rowsAffected !== taskIds.length) {
                    throw new Error('Task delete count changed during batch.')
                }

                removed = {
                    ids: taskIds,
                    imageIds: related.map(relation => relation.imageId),
                }
            }
            else {
                const discardCondition = and(
                    eq(tasks.discard, true),
                    notInArray(tasks.status, ['queued', 'running']),
                )
                const targetsQuery = database.db
                    .select({ id: tasks.id })
                    .from(tasks)
                    .where(discardCondition)
                const relatedQuery = database.db
                    .selectDistinct({ imageId: taskImages.imageId })
                    .from(taskImages)
                    .innerJoin(tasks, eq(tasks.id, taskImages.taskId))
                    .where(discardCondition)
                const deleteQuery = database.db
                    .delete(tasks)
                    .where(discardCondition)

                const [targets, related, deleted] = await database.db.batch([
                    targetsQuery,
                    relatedQuery,
                    deleteQuery,
                ] as const)

                if (deleted.rowsAffected !== targets.length) {
                    throw new Error('Discard task delete count changed during batch.')
                }

                removed = {
                    ids: targets.map(task => task.id),
                    imageIds: related.map(relation => relation.imageId),
                }
            }

            const deletedImageCount = await imageService.deleteUnreferenced(
                database,
                [...new Set(removed.imageIds)],
            )

            return done({
                ids: removed.ids,
                deletedImageCount,
            })
        })
    },

    async remove(database: DatabaseClient, taskId: UUID) {
        const result = await taskService.removeMany(
            database,
            { scope: 'selected', taskIds: [taskId] },
            { allowActive: true },
        )

        return result.ok
            ? done({ id: taskId })
            : fail(result.error)
    },

    async getTasks(
        database: DatabaseClient,
        query: TaskApi.GetTasksQuery,
    ) {
        const cursor = query.cursor === undefined
            ? undefined
            : decodeCursor(query.cursor)
        if (query.cursor !== undefined && !cursor) {
            return fail('INVALID_TASK_CURSOR')
        }

        const search = query.search?.trim()
        const outputRelations = alias(taskImages, 'outputRelations')
        const outputImages = alias(images, 'outputImages')
        const outputCount = database.db
            .select({ count: count().as('count') })
            .from(outputRelations)
            .where(and(
                eq(outputRelations.taskId, tasks.id),
                eq(outputRelations.type, 'output'),
            ))
            .as('outputCount')
        const thumbnailImageId = database.db
            .select({ id: outputImages.id })
            .from(outputRelations)
            .innerJoin(outputImages, eq(outputImages.id, outputRelations.imageId))
            .where(and(
                eq(outputRelations.taskId, tasks.id),
                eq(outputRelations.type, 'output'),
            ))
            .orderBy(asc(outputRelations.sortIndex), asc(outputRelations.id))
            .limit(1)
            .as('thumbnailImageId')
        const rows = await database.db
            .select({
                id: tasks.id,
                name: tasks.name,
                status: tasks.status,
                pin: tasks.pin,
                discard: tasks.discard,
                createdAt: tasks.createdAt,
                outputCount,
                thumbnailImageId,
            })
            .from(tasks)
            .where(and(
                query.taskFlags
                    ? or(
                        query.taskFlags.includes('unflag')
                            ? and(eq(tasks.pin, false), eq(tasks.discard, false))
                            : undefined,
                        query.taskFlags.includes('pin')
                            ? eq(tasks.pin, true)
                            : undefined,
                        query.taskFlags.includes('discard')
                            ? eq(tasks.discard, true)
                            : undefined,
                    )
                    : undefined,
                cursor
                    ? sql`(${tasks.createdAt}, ${tasks.id}) < (${cursor.createdAt}, ${cursor.id})`
                    : undefined,
                search
                    ? or(
                        like(tasks.name, `%${search}%`),
                        like(tasks.id, `%${search}%`),
                    )
                    : undefined,
            ))
            .orderBy(desc(tasks.createdAt), desc(tasks.id))
            .limit(query.limit + 1)
            .all()

        const hasMore = rows.length > query.limit
        const page = hasMore ? rows.slice(0, query.limit) : rows
        const items = page.map(row => ({
            id: row.id,
            name: row.name,
            status: row.status,
            pin: row.pin,
            discard: row.discard,
            outputCount: row.outputCount,
            createdAt: new Date(row.createdAt).toISOString(),
            ...(row.thumbnailImageId
                ? { thumbnail: `/api/image/${row.thumbnailImageId}` }
                : {}),
        }))
        const last = page.at(-1)

        return done({
            items,
            ...(hasMore && last
                ? { nextCursor: encodeCursor(last.createdAt, last.id) }
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
            pin: item.task.pin,
            discard: item.task.discard,
            createdAt: item.task.createdAt.toISOString(),
            images: toOutputResources(item.images),
            outputCount: item.images.filter(image => image.type === 'output').length,
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

            let storageError: string | undefined
            let completed = false

            await withImageMutation(async () => {
                const ingestedImageIds: UUID[] = []
                const cleanupIngestedImages = async () => {
                    if (ingestedImageIds.length === 0) return

                    const imageIds = ingestedImageIds.splice(0)
                    await imageService.deleteUnreferenced(database, imageIds)
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
                await taskService.fail(
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
                    await removeComfyImage(config.comfyuiOutputDir, image)
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
             * db:gc。
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

    return true
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
    return typeof cursor.createdAt === 'number'
        && Number.isSafeInteger(cursor.createdAt)
        && cursor.createdAt >= 0
        && typeof cursor.id === 'string'
        && cursor.id.length > 0
}

function encodeCursor(createdAt: number, id: string): string {
    return Buffer.from(JSON.stringify({
        createdAt,
        id,
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
