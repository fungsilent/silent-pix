import { readFile } from 'node:fs/promises'
import { isAbsolute, relative, resolve } from 'node:path'

import { toUUID } from '@silent-pix/db'
import { appApi, taskApi } from '@silent-pix/shared'
import { Elysia } from 'elysia'

import { loadConfig } from '#/config'
import { comfyMiddleware } from '#/middleware/comfy'
import { databaseMiddleware } from '#/middleware/database'
import { eventMiddleware } from '#/middleware/event'
import { taskRemoved } from '#/module/task/task.event'
import { taskService } from '#/module/task/task.service'
import { contentType } from '#/module/task/task.util'

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
                if (creation.error === 'WORKFLOW_NOT_FOUND') {
                    return status(404, {
                        error: {
                            code: creation.error,
                            message: 'Workflow not found.',
                        },
                    })
                }

                return status(500, {
                    error: {
                        code: creation.error,
                        message: 'Failed to create task.',
                    },
                })
            }

            const createdTask = await taskService.getTaskResponse(database, creation.data.id)
            if (!createdTask) {
                throw new Error('Created task could not be loaded.')
            }

            void taskService.generate(database, comfyClient, creation.data.id, pushEvent)

            return status(201, createdTask)
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
    .patch(
        '/:taskId/name',
        async ({ body, database, params, pushEvent, status }) => {
            const taskId = toUUID(params.taskId, 'taskId')
            const [renamed] = await taskService.updateTask(database, {
                id: taskId,
                name: body.name,
            })

            if (!renamed) {
                return status(404, {
                    error: {
                        code: 'TASK_NOT_FOUND',
                        message: 'Task not found.',
                    },
                })
            }

            const task = await taskService.getTaskResponse(database, taskId)
            if (!task) {
                throw new Error('Renamed task could not be loaded.')
            }

            await taskService.publishChanged(database, taskId, pushEvent)

            return task
        },
        {
            params: taskApi.renameTaskParams,
            body: taskApi.renameTaskRequest,
            response: {
                200: taskApi.renameTaskResponse,
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
            const task = await taskService.getTaskResponse(
                database,
                toUUID(params.taskId, 'taskId'),
            )
            if (!task) {
                return status(404, {
                    error: {
                        code: 'TASK_NOT_FOUND',
                        message: 'Task not found.',
                    },
                })
            }

            return task
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
    .delete(
        '/:taskId',
        async ({ database, params, pushEvent, status }) => {
            const result = await taskService.remove(
                database,
                toUUID(params.taskId, 'taskId'),
            )

            if (!result.ok) {
                return status(404, {
                    error: {
                        code: result.error,
                        message: 'Task not found.',
                    },
                })
            }

            pushEvent(taskRemoved(result.data.id))

            return result.data
        },
        {
            params: taskApi.deleteTaskRequest,
            response: {
                200: taskApi.deleteTaskResponse,
                404: appApi.errorResponse,
                422: appApi.errorResponse,
                500: appApi.errorResponse,
            },
        },
    )
    .get(
        '/lora',
        async ({ comfyClient }) => {
            const options = await taskService.loraList(comfyClient)
            return {
                options,
            }
        },
        {
            response: {
                200: taskApi.getLorasResponse,
                422: appApi.errorResponse,
                500: appApi.errorResponse,
            },
        },
    )
    .get(
        '/sampler',
        async ({ comfyClient }) => {
            const options = await taskService.samplerList(comfyClient)
            return {
                options
            }
        },
        {
            response: {
                200: taskApi.getSamplersResponse,
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
