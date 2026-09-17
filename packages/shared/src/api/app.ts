import { z } from 'zod'

/* MARK: query */

const eventQuery = z.object({
    clientId: z.uuid(),
})

/* MARK: response */

const getHealthResponse = z.object({
    database: z.boolean(),
    comfy: z.boolean(),
})

const errorResponse = z.object({
    error: z.object({
        code: z.string(),
        message: z.string(),
    }),
})

/* MARK: catalog */

export const appApi = {
    errorResponse,
    eventQuery,
    getHealthResponse,
} as const

/* MARK: inferred types */

export type ErrorResponse = z.output<typeof errorResponse>
export type EventQuery = z.output<typeof eventQuery>
export type GetHealthResponse = z.output<typeof getHealthResponse>
