import { z } from 'zod'

import { changed as healthSnapshot } from '#/event/health'
import { changed as taskChanged, removed as taskRemoved } from '#/event/task'

import type { Changed as HealthSnapshot } from '#/event/health'
import type { Changed as TaskChanged, Removed as TaskRemoved } from '#/event/task'

export * as health from '#/event/health'
export type * as Health from '#/event/health'

export * as task from '#/event/task'
export type * as Task from '#/event/task'

export const serverEvent = z.discriminatedUnion('type', [taskChanged, taskRemoved, healthSnapshot])
export type ServerEvent = TaskChanged | TaskRemoved | HealthSnapshot
