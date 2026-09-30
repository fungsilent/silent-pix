import { getApiClient, unwrap } from '#/api/api.client'

import type { TaskApi } from '@silent-pix/shared'

export const taskApi = {
    list(query: TaskApi.GetTasksQuery): Promise<TaskApi.GetTasksResponse> {
        return unwrap(getApiClient().api.task.get({ query }))
    },

    detail(request: TaskApi.GetTaskRequest): Promise<TaskApi.GetTaskResponse> {
        return unwrap(getApiClient().api.task({ taskId: request.taskId }).get())
    },


    create(
        request: TaskApi.CreateTaskRequest,
        signal?: AbortSignal,
    ): Promise<TaskApi.CreateTaskResponse> {
        return unwrap(getApiClient().api.task.post(request, signal ? { fetch: { signal } } : {}))
    },

    rename(
        request: TaskApi.RenameTaskParams & TaskApi.RenameTaskRequest,
    ): Promise<TaskApi.RenameTaskResponse> {
        return unwrap(getApiClient().api.task({ taskId: request.taskId }).name.patch({
            name: request.name,
        }, {}))
    },

    setFlags(
        request: TaskApi.UpdateTaskFlagsRequest,
    ): Promise<TaskApi.UpdateTaskFlagsResponse> {
        return unwrap(getApiClient().api.task.flag.patch(request, {}))
    },

    removeTasks(
        request: TaskApi.DeleteTasksRequest,
        signal?: AbortSignal,
    ): Promise<TaskApi.DeleteTasksResponse> {
        return unwrap(getApiClient().api.task.delete(
            request,
            signal ? { fetch: { signal } } : {},
        ))
    },

    removeTask(request: TaskApi.DeleteTaskRequest): Promise<TaskApi.DeleteTaskResponse> {
        return unwrap(getApiClient().api.task({ taskId: request.taskId }).delete(undefined, {}))
    },

    listSamplers(): Promise<TaskApi.GetSamplersResponse> {
        return unwrap(getApiClient().api.task.sampler.get())
    },

    listLoras(): Promise<TaskApi.GetLorasResponse> {
        return unwrap(getApiClient().api.task.lora.get())
    },
}
