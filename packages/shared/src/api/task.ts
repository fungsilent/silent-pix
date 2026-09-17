import {
    createTaskHeaders,
    createTaskRequest,
    createTaskResponse,
} from '#shared/api/task/create'
import {
    deleteTaskRequest,
    deleteTaskResponse,
    deleteTasksRequest,
    deleteTasksResponse,
} from '#shared/api/task/delete'
import {
    getTaskRequest,
    getTaskResponse,
} from '#shared/api/task/detail'
import {
    updateTaskFlagsRequest,
    updateTaskFlagsResponse,
} from '#shared/api/task/flag'
import {
    getTasksQuery,
    getTasksResponse,
} from '#shared/api/task/list'
import {
    getLorasResponse,
    getSamplersResponse,
} from '#shared/api/task/option'
import {
    renameTaskParams,
    renameTaskRequest,
    renameTaskResponse,
} from '#shared/api/task/rename'
import { taskGenerateConfig, taskPromptDocument } from '#shared/contract/task'

/* MARK: catalog */

export const taskApi = {
    createTaskHeaders,
    createTaskRequest,
    createTaskResponse,
    deleteTaskRequest,
    deleteTaskResponse,
    deleteTasksRequest,
    deleteTasksResponse,
    getLorasResponse,
    getSamplersResponse,
    getTaskRequest,
    getTaskResponse,
    getTasksQuery,
    getTasksResponse,
    renameTaskParams,
    renameTaskRequest,
    renameTaskResponse,
    taskGenerateConfig,
    taskPromptDocument,
    updateTaskFlagsRequest,
    updateTaskFlagsResponse,
} as const

/* MARK: inferred types */

export type {
    TaskFlag,
    TaskFilterFlag,
    TaskGenerateConfig,
    TaskListItem,
    TaskPromptDocument,
    TaskPromptGroup,
    TaskStatus,
} from '#shared/contract/task'
export type {
    CreateTaskPayload,
    CreateTaskRequest,
    CreateTaskResponse,
} from '#shared/api/task/create'
export type {
    DeleteTaskRequest,
    DeleteTaskResponse,
    DeleteTasksRequest,
    DeleteTasksResponse,
} from '#shared/api/task/delete'
export type {
    GetLorasResponse,
    GetSamplersResponse,
} from '#shared/api/task/option'
export type {
    GetTaskRequest,
    GetTaskResponse,
} from '#shared/api/task/detail'
export type {
    GetTasksQuery,
    GetTasksResponse,
} from '#shared/api/task/list'
export type {
    RenameTaskParams,
    RenameTaskRequest,
    RenameTaskResponse,
} from '#shared/api/task/rename'
export type {
    TaskFlagState,
    UpdateTaskFlagsRequest,
    UpdateTaskFlagsResponse,
} from '#shared/api/task/flag'
