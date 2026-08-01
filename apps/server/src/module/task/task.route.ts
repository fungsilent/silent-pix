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