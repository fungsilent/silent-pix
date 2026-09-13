import { z } from 'zod'

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
    getHealthResponse,
} as const

/* MARK: inferred types */

export type ErrorResponse = z.output<typeof errorResponse>
export type GetHealthResponse = z.output<typeof getHealthResponse>
