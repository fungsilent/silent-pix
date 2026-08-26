import { z } from 'zod'

import { changed as healthSnapshot } from '#/event/health'
import { changed as taskChanged, created as taskCreated, removed as taskRemoved } from '#/event/task'
import { changed as workflowChanged, removed as workflowRemoved } from '#/event/workflow'

import type { Changed as HealthSnapshot } from '#/event/health'
import type { Changed as TaskChanged, Created as TaskCreated, Removed as TaskRemoved } from '#/event/task'
import type { Changed as WorkflowChanged, Removed as WorkflowRemoved } from '#/event/workflow'

export * as health from '#/event/health'
export type * as Health from '#/event/health'

export * as task from '#/event/task'
export type * as Task from '#/event/task'

export * as workflow from '#/event/workflow'
export type * as Workflow from '#/event/workflow'

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
