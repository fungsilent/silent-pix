import { readFile } from 'node:fs/promises'
import { isAbsolute, relative, resolve } from 'node:path'

import { toUUID } from '@silent-pix/db'
import { appApi, taskApi } from '@silent-pix/shared'
import { Elysia } from 'elysia'

import { loadConfig } from '#/config'
import { comfyMiddleware } from '#/middleware/comfy'
import { databaseMiddleware } from '#/middleware/database'
import { eventMiddleware } from '#/middleware/event'
import { taskService } from '#/module/task/task.service'
import { contentType, imageUrl } from '#/module/task/task.util'

const storageRoot = resolve(loadConfig().appStorageDir)

export const taskRoutes = new Elysia({ name: 'task-routes', prefix: '/task' })
    .use(databaseMiddleware)
    .use(comfyMiddleware)
    .use(eventMiddleware)
    .get(
        '/',
        async ({ database, query, status }) => {
            const result = await taskService.getTasks(database, query)

            if (!result.ok) {
                return status(422, {
                    error: {
                        code: result.error,
                        message: 'Invalid task cursor.',
                    },
                })
            }

            return result.data
        },
        {
            query: taskApi.getTasksQuery,
            response: {
                200: taskApi.getTasksResponse,
                422: appApi.errorResponse,
                500: appApi.errorResponse,
            },
        },
    )
    .post(
        '/',
        async ({ body, database, comfyClient, pushEvent, status }) => {
            const creation = await taskService.create(database, body)
            if (!creation.ok) {
                return status(404, {
                    error: {
                        code: creation.error,
                        message: 'Failed to create task.',
                    },
                })
            }

            void taskService.generate(database, comfyClient, creation.data.id, pushEvent)

            return status(201, {
                id: creation.data.id,
                status: creation.data.status,
                createdAt: creation.data.createdAt.toISOString(),
            })
        },
        {
            body: taskApi.createTaskRequest,
            response: {
                201: taskApi.createTaskResponse,
                404: appApi.errorResponse,
                422: appApi.errorResponse,
                500: appApi.errorResponse,
            },
        },
    )
    .get(
        '/:taskId/image/:filename',
        async ({ database, params, status }) => {
            const image = await taskService.findImage(database, params)

            if (!image) {
                return status(404, {
                    error: {
                        code: 'TASK_IMAGE_NOT_FOUND',
                        message: 'Task image not found.',
                    },
                })
            }

            const absolutePath = resolve(storageRoot, image.path)
            const relativePath = relative(storageRoot, absolutePath)

            if (relativePath.startsWith('..') || isAbsolute(relativePath)) {
                throw new Error('Task image path is outside app storage.')
            }

            try {
                const bytes = new Uint8Array(await readFile(absolutePath))

                return new Response(bytes, {
                    headers: {
                        'content-type': contentType(image.filename),
                    },
                })
            }
            catch (error) {
                if (isFileNotFoundError(error)) {
                    return status(404, {
                        error: {
                            code: 'TASK_IMAGE_FILE_NOT_FOUND',
                            message: 'Task image file not found.',
                        },
                    })
                }

                throw error
            }
        },
        {
            params: taskApi.getTaskImageRequest,
            response: {
                404: appApi.errorResponse,
                422: appApi.errorResponse,
                500: appApi.errorResponse,
            },
        },
    )
    .get(
        '/:taskId',
        async ({ database, params, status }) => {
            const item = await taskService.findTask(database, toUUID(params.taskId, 'taskId'), {
                includeWorkflow: true,
                includeImage: true,
            })
            if (!item) {
                return status(404, {
                    error: {
                        code: 'TASK_NOT_FOUND',
                        message: 'Task not found.',
                    },
                })
            }

            return {
                id: item.task.id,
                name: item.task.name,
                status: item.task.status,
                createdAt: item.task.createdAt.toISOString(),
                workflow: item.workflow.name,
                config: item.task.config.config,
                lora: item.task.config.lora,
                prompt: item.task.config.prompt,
                images: item.images.map(image => imageUrl(item.task.id, image.filename)),
            }
        },
        {
            params: taskApi.getTaskRequest,
            response: {
                200: taskApi.getTaskResponse,
                404: appApi.errorResponse,
                422: appApi.errorResponse,
                500: appApi.errorResponse,
            },
        },
    )

function isFileNotFoundError(error: unknown): boolean {
    return error instanceof Error
        && 'code' in error
        && error.code === 'ENOENT'
}
