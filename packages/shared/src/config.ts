import { z } from 'zod'

/* MARK: generator fields */

/*
 * Web 控制得到的欄位就是這一份，順序也是 editor 的顯示順序。
 * 這裡是 generation config 的 domain 定義，不屬於任何一個 REST endpoint。
 */
export const generatorFieldDefinitions = [
    { field: 'seed', group: 'Sampler' },
    { field: 'steps', group: 'Sampler' },
    { field: 'cfg', group: 'Sampler' },
    { field: 'samplerName', group: 'Sampler' },
    { field: 'denoise', group: 'Sampler' },
    { field: 'width', group: 'Latent' },
    { field: 'height', group: 'Latent' },
    { field: 'batchSize', group: 'Latent' },
    { field: 'positivePrompt', group: 'Prompt' },
    { field: 'negativePrompt', group: 'Prompt' },
    { field: 'loraData', group: 'Other' },
    { field: 'initImagePath', group: 'Other' },
] as const

export type GeneratorField = typeof generatorFieldDefinitions[number]['field']
export type GeneratorFieldGroupLabel = typeof generatorFieldDefinitions[number]['group']

export type GeneratorFieldGroup = {
    label: GeneratorFieldGroupLabel
    fields: readonly GeneratorField[]
}

function toFieldTuple(
    definitions: typeof generatorFieldDefinitions,
): readonly [GeneratorField, ...GeneratorField[]] {
    const [head, ...tail] = definitions

    return [head.field, ...tail.map(definition => definition.field)]
}

function toFieldGroups(definitions: typeof generatorFieldDefinitions): readonly GeneratorFieldGroup[] {
    const groups: { label: GeneratorFieldGroupLabel, fields: GeneratorField[] }[] = []

    for (const definition of definitions) {
        const current = groups[groups.length - 1]

        if (current && current.label === definition.group) {
            current.fields.push(definition.field)
            continue
        }

        groups.push({ label: definition.group, fields: [definition.field] })
    }

    return groups
}

export const generatorFields = toFieldTuple(generatorFieldDefinitions)
export const generatorFieldGroups = toFieldGroups(generatorFieldDefinitions)

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
