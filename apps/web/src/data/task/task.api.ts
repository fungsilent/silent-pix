import { getApiClient, requestSignal, unwrap } from '#/lib/api-client'

import type { TaskApi } from '@silent-pix/shared'

export const taskApi = {
    list(query: TaskApi.GetTasksQuery, signal: AbortSignal): Promise<TaskApi.GetTasksResponse> {
        return unwrap(getApiClient().api.task.get({ query, fetch: { signal: requestSignal({ signal }) } }))
    },

    detail(request: TaskApi.GetTaskRequest): Promise<TaskApi.GetTaskResponse> {
        return unwrap(getApiClient().api.task({ taskId: request.taskId }).get())
    },

    create(request: TaskApi.CreateTaskRequest): Promise<TaskApi.CreateTaskResponse> {
        return unwrap(getApiClient().api.task.post(request, {}))
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

    removeTasks(request: TaskApi.DeleteTasksRequest): Promise<TaskApi.DeleteTasksResponse> {
        return unwrap(getApiClient().api.task.delete(request, {
            fetch: { signal: requestSignal({ timeoutMs: 60_000 }) },
        }))
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
