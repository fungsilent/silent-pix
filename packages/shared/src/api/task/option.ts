import { z } from 'zod'

/* MARK: response */

const samplerOption = z.object({
    label: z.string().trim().min(1).max(120),
    value: z.string().trim().min(1).max(120),
})

export const getSamplersResponse = z.object({
    options: z.array(samplerOption),
})

const loraOption = z.object({
    label: z.string().min(1),
    value: z.string().min(1),
})

export const getLorasResponse = z.object({
    options: z.array(loraOption),
})

/* MARK: inferred types */

export type GetSamplersResponse = z.output<typeof getSamplersResponse>
export type GetLorasResponse = z.output<typeof getLorasResponse>
