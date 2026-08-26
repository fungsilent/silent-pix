import { z } from 'zod'

/* MARK: generator fields */

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

export type GeneratorField = typeof generatorFields[number]

export const generatorField = z.enum(generatorFields)

export function isGeneratorField(value: string): value is GeneratorField {
    return (generatorFields as readonly string[]).includes(value)
}

/* MARK: config schema */

export const mapping = z.object({
    nodeId: z.string().min(1),
    input: z.string().min(1),
})

export type Mapping = z.output<typeof mapping>

export const configSchema = z.partialRecord(generatorField, mapping)

export type ConfigSchema = z.output<typeof configSchema>
