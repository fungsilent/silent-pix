import { z } from 'zod'

import { changed as healthSnapshot } from '#shared/event/health'
import { changed as taskChanged, created as taskCreated, removed as taskRemoved } from '#shared/event/task'
import { changed as workflowChanged, removed as workflowRemoved } from '#shared/event/workflow'

/* MARK: event */

export const serverEvent = z.discriminatedUnion('type', [
    taskCreated,
    taskChanged,
    taskRemoved,
    workflowChanged,
    workflowRemoved,
    healthSnapshot,
])

/* MARK: inferred types */

export type * as Health from '#shared/event/health'
export type * as Task from '#shared/event/task'
export type * as Workflow from '#shared/event/workflow'
export type ServerEvent = z.output<typeof serverEvent>
