import { imageMime, imageMimeValues } from '#shared/contract/image'
import {
    taskFilterFlags,
    taskStatuses,
} from '#shared/contract/task'
import { configSchema, generatorFields, isGeneratorField } from '#shared/contract/workflow/config'
import { isGraphLink, parseApiGraph, validateMapping } from '#shared/contract/workflow/graph'
import { heartbeatIntervalMs, staleTimeoutMs } from '#shared/event/health'
import { serverEvent } from '#shared/event/index'

export { appApi } from '#shared/api/app'

export const comfy = {
    isGraphLink,
    parseApiGraph,
    validateMapping,
}
export type * as Comfy from '#shared/contract/workflow/graph'

export const config = {
    configSchema,
    generatorFields,
    isGeneratorField,
}
export type {
    ConfigSchema,
    GeneratorField,
    Mapping,
} from '#shared/contract/workflow/config'

export const image = {
    imageMime,
    imageMimeValues,
} as const
export type * as Image from '#shared/contract/image'

export const task = {
    statuses: taskStatuses,
    filterFlags: taskFilterFlags,
} as const
export type * as Task from '#shared/contract/task'

export type * as AppApi from '#shared/api/app'

export { imageApi } from '#shared/api/image'
export type * as ImageApi from '#shared/api/image'

export { taskApi } from '#shared/api/task'
export type * as TaskApi from '#shared/api/task'

export { workflowApi } from '#shared/api/workflow'
export type * as WorkflowApi from '#shared/api/workflow'

export const event = {
    health: {
        heartbeatIntervalMs,
        staleTimeoutMs,
    },
    serverEvent,
}
export type * as Event from '#shared/event/index'
