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

    async create(request: TaskApi.CreateTaskRequest): Promise<TaskApi.CreateTaskResponse> {
        const { data, error } = await apiClient.api.task.post(request)

        if (error) {
            const { code, message } = error.value.error

            throw new ApiError(error.status, code, message)
        }

        return data
    },

    async listSamplers(): Promise<TaskApi.GetSamplersResponse> {
        const { data, error } = await apiClient.api.task.sampler.get()

        if (error) {
            const { code, message } = error.value.error

            throw new ApiError(error.status, code, message)
        }

        return data
    },

    async listLoras(): Promise<TaskApi.GetLorasResponse> {
        const { data, error } = await apiClient.api.task.lora.get()

        if (error) {
            const { code, message } = error.value.error

            throw new ApiError(error.status, code, message)
        }

        return data
    },
}
