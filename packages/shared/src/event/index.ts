import { changed as taskChanged } from '#/event/task'

import type { Changed as TaskChanged } from '#/event/task'

export * as task from '#/event/task'
export type * as Task from '#/event/task'

export const serverEvent = taskChanged
export type ServerEvent = TaskChanged
