import { toUUID } from '@silent-pix/db'
import { appApi, taskApi } from '@silent-pix/shared'
import { Elysia } from 'elysia'

import { comfyMiddleware } from '#/middleware/comfy'
import { databaseMiddleware } from '#/middleware/database'
import { eventMiddleware } from '#/middleware/event'
import { taskCreated, taskRemoved } from '#/module/task/task.event'
import { taskExecution } from '#/module/task/task.execution'
import { taskService } from '#/module/task/task.service'

export const taskRoutes = new Elysia({ name: 'task-routes', prefix: '/task' })
    .use(databaseMiddleware)
    .use(comfyMiddleware)
    .use(eventMiddleware)
    .get(
        '/',
        async ({ databaseClient, query, status }) => {
            const result = await taskService.getTasks(databaseClient.database, query)

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
        async ({ body, databaseClient, comfyClient, pushEvent, status }) => {
            const creation = await taskService.create(databaseClient.database, body)

            if (!creation.ok) {
                const failure = createFailures[creation.error]

                if (failure) {
                    return status(failure.status, {
                        error: {
                            code: creation.error,
                            message: failure.message,
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

            const { task, workflow } = creation.data
            const createdTask = await taskService.getTaskResponse(databaseClient.database, task.id)
            if (!createdTask) {
                throw new Error('Created task could not be loaded.')
            }

            const taskSnapshot = await taskService.snapshot(databaseClient.database, task.id)
            if (taskSnapshot) {
                pushEvent(taskCreated(taskSnapshot))
            }

            void taskExecution.generate(databaseClient.database, comfyClient, task.id, workflow, pushEvent)

            return status(201, createdTask)
        },
        {
            body: taskApi.createTaskRequest,
            response: {
                201: taskApi.createTaskResponse,
                404: appApi.errorResponse,
                409: appApi.errorResponse,
                415: appApi.errorResponse,
                422: appApi.errorResponse,
                500: appApi.errorResponse,
                503: appApi.errorResponse,
            },
        },
    )
    .patch(
        '/:taskId/name',
        async ({ body, databaseClient, params, pushEvent, status }) => {
            const taskId = toUUID(params.taskId, 'taskId')
            const renamed = await taskService.updateTask(databaseClient.database, {
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

            const task = await taskService.getTaskResponse(databaseClient.database, taskId)
            if (!task) {
                throw new Error('Renamed task could not be loaded.')
            }

            await taskService.publishChanged(databaseClient.database, taskId, pushEvent)

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
    .patch(
        '/flag',
        async ({ body, databaseClient, pushEvent, status }) => {
            const result = await taskService.setFlags(databaseClient.database, body)

            if (!result.ok) {
                return status(404, {
                    error: {
                        code: result.error,
                        message: 'Task not found.',
                    },
                })
            }

            await taskService.publishChangedMany(
                databaseClient.database,
                result.data.tasks.map(task => task.id),
                pushEvent,
            )

            return result.data
        },
        {
            body: taskApi.updateTaskFlagsRequest,
            response: {
                200: taskApi.updateTaskFlagsResponse,
                404: appApi.errorResponse,
                422: appApi.errorResponse,
                500: appApi.errorResponse,
            },
        },
    )
    .get(
        '/:taskId',
        async ({ databaseClient, params, status }) => {
            const task = await taskService.getTaskResponse(
                databaseClient.database,
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
        '/',
        async ({ body, databaseClient, pushEvent, status }) => {
            const result = await taskService.removeTasks(databaseClient.database, body)

            if (!result.ok) {
                if (result.error === 'TASK_ACTIVE') {
                    return status(409, {
                        error: {
                            code: result.error,
                            message: 'One or more tasks are still active.',
                        },
                    })
                }

                return status(404, {
                    error: {
                        code: result.error,
                        message: 'Task not found.',
                    },
                })
            }

            if (result.data.ids.length > 0) {
                pushEvent(taskRemoved(result.data.ids))
            }

            return result.data
        },
        {
            body: taskApi.deleteTasksRequest,
            response: {
                200: taskApi.deleteTasksResponse,
                404: appApi.errorResponse,
                409: appApi.errorResponse,
                422: appApi.errorResponse,
                500: appApi.errorResponse,
                503: appApi.errorResponse,
            },
        },
    )
    .delete(
        '/:taskId',
        async ({ databaseClient, params, pushEvent, status }) => {
            const result = await taskService.removeTask(
                databaseClient.database,
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

            pushEvent(taskRemoved([result.data.id]))

            return result.data
        },
        {
            params: taskApi.deleteTaskRequest,
            response: {
                200: taskApi.deleteTaskResponse,
                404: appApi.errorResponse,
                422: appApi.errorResponse,
                500: appApi.errorResponse,
                503: appApi.errorResponse,
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

const createFailures: Record<string, { status: 404 | 409 | 415 | 422, message: string } | undefined> = {
    WORKFLOW_NOT_FOUND: { status: 404, message: 'Workflow not found.' },
    WORKFLOW_ARCHIVED: { status: 409, message: 'This workflow is archived and cannot be used.' },
    REFERENCE_IMAGE_NOT_FOUND: { status: 404, message: 'Reference image not found.' },
    IMAGE_UNSUPPORTED_TYPE: { status: 415, message: 'Reference image must be a PNG or JPEG.' },
    IMAGE_EMPTY: { status: 422, message: 'Reference image is empty.' },
}
