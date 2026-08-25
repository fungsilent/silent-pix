import { z } from 'zod'

/* MARK: generator fields */

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

/* MARK: comfy graph */

export const comfyNode = z.looseObject({
    class_type: z.string().min(1),
    inputs: z.record(z.string(), z.unknown()),
    _meta: z.looseObject({ title: z.string().optional() }).optional(),
})

export type ComfyNode = z.output<typeof comfyNode>

export const comfyGraph = z.record(z.string().min(1), comfyNode)

export type ComfyGraph = z.output<typeof comfyGraph>

export type ParseApiGraphFailure = 'not-object' | 'ui-format' | 'invalid-node'

export type ParseApiGraphResult =
    | { ok: true, graph: ComfyGraph }
    | { ok: false, reason: ParseApiGraphFailure }

/* ComfyUI 的 API format 裡，一個 input 的值若是 [nodeId, slot] 就代表它接了線*/
export function isComfyLink(value: unknown): value is readonly [string, number] {
    if (!Array.isArray(value) || value.length !== 2) {
        return false
    }

    const [nodeId, slot] = value as [unknown, unknown]

    return typeof nodeId === 'string'
        && typeof slot === 'number'
        && Number.isInteger(slot)
        && slot >= 0
}

export function parseApiGraph(value: unknown): ParseApiGraphResult {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
        return { ok: false, reason: 'not-object' }
    }

    if (Array.isArray((value as { nodes?: unknown }).nodes)) {
        return { ok: false, reason: 'ui-format' }
    }

    const result = comfyGraph.safeParse(value)

    if (!result.success) {
        return { ok: false, reason: 'invalid-node' }
    }

    return { ok: true, graph: result.data }
}

/* MARK: mapping validation */

export type MappingIssueReason =
    | 'node-missing'
    | 'input-missing'
    | 'input-linked'

export type MappingIssue = {
    field: GeneratorField
    reason: MappingIssueReason
    nodeId: string
    input: string
}

export function validateMapping(graph: ComfyGraph, schema: ConfigSchema): MappingIssue[] {
    const issues: MappingIssue[] = []

    for (const definition of generatorFieldDefinitions) {
        const binding = schema[definition.field]

        /* 沒綁定是合法狀態，不是問題 */
        if (!binding) {
            continue
        }

        const issue = (reason: MappingIssueReason): MappingIssue => ({
            field: definition.field,
            reason,
            nodeId: binding.nodeId,
            input: binding.input,
        })

        const node = graph[binding.nodeId]

        if (!node) {
            issues.push(issue('node-missing'))
            continue
        }

        if (!(binding.input in node.inputs)) {
            issues.push(issue('input-missing'))
            continue
        }

        if (isComfyLink(node.inputs[binding.input])) {
            issues.push(issue('input-linked'))
        }
    }

    return issues
}

/* MARK: node options */

export type ComfyNodeOption = {
    nodeId: string
    /* _meta.title 優先，沒有才用 class_type —— 使用者改過名的節點好認得多 */
    label: string
    classType: string
    /* 值是連線的 input 排除掉：選了也寫不進去 */
    inputs: readonly string[]
}

export function toNodeOptions(graph: ComfyGraph): ComfyNodeOption[] {
    return Object.entries(graph).map(([nodeId, node]) => ({
        nodeId,
        label: node._meta?.title?.trim() || node.class_type,
        classType: node.class_type,
        inputs: Object.entries(node.inputs)
            .filter(([, value]) => !isComfyLink(value))
            .map(([input]) => input),
    }))
}

/* MARK: rest */

export const workflowOption = z.object({
    id: z.uuid(),
    name: z.string().trim().min(1).max(120),
})

export type WorkflowOption = z.output<typeof workflowOption>

export const getWorkflowsResponse = z.object({
    options: z.array(workflowOption),
})

export type GetWorkflowsResponse = z.output<typeof getWorkflowsResponse>
