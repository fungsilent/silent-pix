import { apiClient, ApiError } from '#/api/client'

import type { TaskApi } from '@silent-pix/shared'

export const taskApi = {
    async list(query: TaskApi.GetTasksQuery): Promise<TaskApi.GetTasksResponse> {
        const { data, error } = await apiClient.api.task.get({ query })

        if (error) {
            const { code, message } = error.value.error

            throw new ApiError(error.status, code, message)
        }

        return data
    },

    async detail(request: TaskApi.GetTaskRequest): Promise<TaskApi.GetTaskResponse> {
        const { data, error } = await apiClient.api.task({ taskId: request.taskId }).get()

        if (error) {
            const { code, message } = error.value.error

            throw new ApiError(error.status, code, message)
        }

        return data
    },
}