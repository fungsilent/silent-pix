import { apiClient, unwrap } from '#/api/api.client'

import type { TaskApi } from '@silent-pix/shared'

export const taskApi = {
    list(query: TaskApi.GetTasksQuery): Promise<TaskApi.GetTasksResponse> {
        return unwrap(apiClient.api.task.get({ query }))
    },

    detail(request: TaskApi.GetTaskRequest): Promise<TaskApi.GetTaskResponse> {
        return unwrap(apiClient.api.task({ taskId: request.taskId }).get())
    },

    create(request: TaskApi.CreateTaskRequest): Promise<TaskApi.CreateTaskResponse> {
        return unwrap(apiClient.api.task.post(request))
    },

    listSamplers(): Promise<TaskApi.GetSamplersResponse> {
        return unwrap(apiClient.api.task.sampler.get())
    },

    listLoras(): Promise<TaskApi.GetLorasResponse> {
        return unwrap(apiClient.api.task.lora.get())
    },
}
