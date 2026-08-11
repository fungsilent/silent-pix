import { mkdir, unlink, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'

import {
    createUUID,
    taskImages,
    tasks,
    toUUID,
    workflows,
} from '@silent-pix/db'
import { and, desc, eq, inArray } from 'drizzle-orm'

import { loadConfig } from '#/config'
import { ComfyError } from '#/lib/comfy/comfy.client'
import { buildComfyPrompt, type GenerateConfig, resolveSeed } from '#/lib/comfy/comfy.prompt'
import { done, fail } from '#/lib/service-result'
import { taskChanged } from '#/module/task/task.event'
import { castTaskImageModel, castTaskModel, castWorkflowModel } from '#/module/task/task.model'
import { imageFilename, imageUrl } from '#/module/task/task.util'

import type { DatabaseClient, TaskStatus, TaskUpdate, UUID } from '@silent-pix/db'
import type { TaskApi } from '@silent-pix/shared'
import type { PushEvent } from '#/app.store'
import type { ComfyClient } from '#/lib/comfy/comfy.client'
import type { TaskImageModel, TaskModel, WorkflowModel } from '#/module/task/task.model'

const config = loadConfig()

type TaskCursor = { createdAt: string, id: string }

type CompletedTaskImage = { imageId: UUID, path: string, filename: string }

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
            const [_workflow] = await database.db
                .select()
                .from(workflows)
                .where(eq(workflows.id, task.workflowId))

            if (!_workflow) {
                return undefined
            }
            workflow = castWorkflowModel(_workflow)
        }

        let images: TaskImageModel[] | undefined = undefined
        if (includeImage) {
            const _images = await database.db
                .select()
                .from(taskImages)
                .where(eq(taskImages.taskId, task.id))
                .orderBy(taskImages.path)

            images = castTaskImageModel(_images)
        }

        return {
            task: castTaskModel(task),
            workflow: workflow as HasWorkflow extends true ? WorkflowModel : never,
            images: images as HasImages extends true ? TaskImageModel[] : never,
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
            images: item.images.map(image => imageUrl(item.task.id, image.filename)),
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
        await database.db
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
    },

    // MARK: Service
    async create(database: DatabaseClient, request: TaskApi.CreateTaskRequest) {
        const workflowId = toUUID(request.workflowId, 'workflowId')
        const [workflow] = await database.db
            .select({ workflowId: workflows.id })
            .from(workflows)
            .where(eq(workflows.id, workflowId))

        if (!workflow) return fail('WORKFLOW_NOT_FOUND')

        const createdAt = Date.now()
        const config: GenerateConfig = {
            config: {
                ...request.config,
                seed: resolveSeed(request.config.seed),
            },
            lora: request.lora,
            prompt: request.prompt,
        }

        const [createdTask] = await database.db
            .insert(tasks)
            .values({
                id: createUUID(),
                name: request.name,
                status: 'queued',
                workflowId,
                config,
                createdAt,
                updatedAt: createdAt,
            })
            .returning()

        if (!createdTask) {
            return fail('CREATE_TASK_FAIL')
        }

        return done(castTaskModel(createdTask))
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
        const images = taskIds.length === 0
            ? []
            : await database.db
                .select()
                .from(taskImages)
                .where(inArray(taskImages.taskId, taskIds))
                .orderBy(taskImages.path)
                .all()

        const firstImage = new Map<string, string>()
        for (const image of images) {
            if (!firstImage.has(image.taskId)) firstImage.set(image.taskId, image.filename)
        }

        const items = selected.map(row => {
            const filename = firstImage.get(row.id)
            return {
                id: row.id,
                status: row.status,
                createdAt: row.createdAt.toISOString(),
                ...(filename ? { thumbnail: imageUrl(row.id, filename) } : {}),
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

    async publishChanged(
        database: DatabaseClient,
        taskId: UUID,
        pushEvent: PushEvent,
    ): Promise<void> {
        const item = await taskService.findTask(database, taskId, { includeImage: true })

        if (!item) {
            return
        }

        pushEvent(taskChanged({
            id: item.task.id,
            status: item.task.status,
            createdAt: item.task.createdAt.toISOString(),
            images: item.images.map(image => imageUrl(item.task.id, image.filename)),
        }))
    },

    async generate(
        database: DatabaseClient,
        client: ComfyClient,
        taskId: UUID,
        pushEvent: PushEvent,
    ) {
        const item = await taskService.findTask(database, taskId, { includeWorkflow: true })

        if (!item) {
            return
        }

        const savedFiles: string[] = []

        try {
            const prompt = buildComfyPrompt(
                item.workflow.graph,
                item.workflow.configSchema,
                item.task.config,
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

            const taskDirectory = resolve(config.appStorageDir, 'tasks', taskId)
            await mkdir(taskDirectory, { recursive: true })

            const completedImages: CompletedTaskImage[] = await Promise.all(outputImages.map(async image => {
                const { imageId, filename } = imageFilename(image.filename)
                const relativePath = `tasks/${taskId}/${filename}`
                const absolutePath = resolve(taskDirectory, filename)
                const bytes = await client.downloadImage(image)

                await writeFile(absolutePath, bytes)
                savedFiles.push(absolutePath)

                return {
                    imageId,
                    path: relativePath,
                    filename,
                }
            }))

            await taskService.complete(database, taskId, completedImages, pushEvent)
        }
        catch (error) {
            console.error(`Task ${taskId} generationn failed.`, error)

            await Promise.allSettled(savedFiles.map(path => unlink(path)))
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
        images: CompletedTaskImage[],
        pushEvent: PushEvent,
    ) {
        await database.db.transaction(async tx => {
            if (images.length) {
                await tx
                    .insert(taskImages)
                    .values(images.map(image => ({
                        taskId,
                        ...image,
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

    findImage(database: DatabaseClient, request: TaskApi.GetTaskImageRequest) {
        return database.db
            .select({
                path: taskImages.path,
                filename: taskImages.filename,
            })
            .from(taskImages)
            .where(and(
                eq(taskImages.taskId, toUUID(request.taskId, 'taskId')),
                eq(taskImages.filename, request.filename),
            ))
            .get()
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
