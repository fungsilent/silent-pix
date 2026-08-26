import { z } from 'zod'

import { changed as healthSnapshot } from '#shared/event/health'
import { changed as taskChanged, created as taskCreated, removed as taskRemoved } from '#shared/event/task'
import { changed as workflowChanged, removed as workflowRemoved } from '#shared/event/workflow'

import type { Changed as HealthSnapshot } from '#shared/event/health'
import type { Changed as TaskChanged, Created as TaskCreated, Removed as TaskRemoved } from '#shared/event/task'
import type { Changed as WorkflowChanged, Removed as WorkflowRemoved } from '#shared/event/workflow'

export * as health from '#shared/event/health'
export type * as Health from '#shared/event/health'

export * as task from '#shared/event/task'
export type * as Task from '#shared/event/task'

export * as workflow from '#shared/event/workflow'
export type * as Workflow from '#shared/event/workflow'

export const serverEvent = z.discriminatedUnion('type', [
    taskCreated,
    taskChanged,
    taskRemoved,
    workflowChanged,
    workflowRemoved,
    healthSnapshot,
])

export type ServerEvent =
    | TaskCreated
    | TaskChanged
    | TaskRemoved
    | WorkflowChanged
    | WorkflowRemoved
    | HealthSnapshot
