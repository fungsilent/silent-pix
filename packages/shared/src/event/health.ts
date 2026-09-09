import { z } from 'zod'

export const heartbeatIntervalMs = 5_000
export const staleTimeoutMs = heartbeatIntervalMs * 2.5

/* MARK: event */

export const snapshot = z.object({
    database: z.boolean(),
    comfy: z.boolean(),
})

export const changed = z.object({
    type: z.literal('health.snapshot'),
    health: snapshot,
})

/* MARK: inferred types */

export type Snapshot = z.output<typeof snapshot>
export type Changed = z.output<typeof changed>
