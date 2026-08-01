import { z } from 'zod'

export const getHealthResponse = z.object({
    database: z.boolean(),
    comfy: z.boolean(),
})

export type GetHealthResponse = z.output<typeof getHealthResponse>

export const errorResponse = z.object({
    error: z.object({
        code: z.string(),
        message: z.string(),
    }),
})

export type ErrorResponse = z.output<typeof errorResponse>