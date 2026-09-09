import { z } from 'zod'

/* MARK: primitives */

export const generatorFields = [
    'seed',
    'steps',
    'cfg',
    'samplerName',
    'denoise',
    'width',
    'height',
    'batchSize',
    'positivePrompt',
    'negativePrompt',
    'loraData',
    'initImagePath',
] as const

export const generatorField = z.enum(generatorFields)

/* MARK: values */

const mapping = z.object({
    nodeId: z.string().min(1),
    input: z.string().min(1),
})

export const configSchema = z.partialRecord(generatorField, mapping)

/* MARK: validation */

export function isGeneratorField(value: string): value is GeneratorField {
    return (generatorFields as readonly string[]).includes(value)
}

/* MARK: inferred types */

export type GeneratorField = typeof generatorFields[number]
export type Mapping = z.output<typeof mapping>
export type ConfigSchema = z.output<typeof configSchema>
