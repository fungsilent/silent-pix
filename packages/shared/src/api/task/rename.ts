import { z } from 'zod'

import { getTaskRequest, getTaskResponse } from '#shared/api/task/detail'

/* MARK: params */

export const renameTaskParams = getTaskRequest

/* MARK: request */

export const renameTaskRequest = z.object({
    name: z.string().trim().min(1).max(120).nullable(),
})

/* MARK: response */

export const renameTaskResponse = getTaskResponse

/* MARK: inferred types */

export type RenameTaskParams = z.output<typeof renameTaskParams>
export type RenameTaskRequest = z.output<typeof renameTaskRequest>
export type RenameTaskResponse = z.output<typeof renameTaskResponse>
