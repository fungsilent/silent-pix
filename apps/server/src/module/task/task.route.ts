import { appApi, taskApi } from '@silent-pix/shared'
import { Elysia } from 'elysia'

import { taskService } from '#/module/task/task.service'

export const taskRoutes = new Elysia({ name: 'task-routes', prefix: '/task' })
    .get(
        '/',
        ({ query, status }) => {
            const result = taskService.findTasks(query)

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
    .get(
        '/:taskId',
        ({ params, status }) => {
            const task = taskService.findTask(params)

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