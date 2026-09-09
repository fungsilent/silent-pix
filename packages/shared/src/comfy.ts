import { z } from 'zod'

import { generatorField, generatorFields } from '#shared/config'

import type { ConfigSchema } from '#shared/config'

/* MARK: values */

const node = z.looseObject({
    class_type: z.string().min(1),
    inputs: z.record(z.string(), z.unknown()),
    _meta: z.looseObject({ title: z.string().optional() }).optional(),
})

export const graph = z.record(z.string().min(1), node)

/* MARK: validation */

const mappingIssueReason = z.enum(['node-missing', 'input-missing', 'input-linked'])

/*
 * NOTE:
 * 綁定驗證是 graph 與 config 的交界：規則要同時認得兩邊，
 * 所以放這裡（comfy -> config 單向相依），不另開 module。
 */
export const mappingIssue = z.object({
    field: generatorField,
    reason: mappingIssueReason,
    nodeId: z.string(),
    input: z.string(),
})

/* MARK: helpers */

/* NOTE: ComfyUI 的 API format 裡，一個 input 的值若是 [nodeId, slot] 就代表它接了線。 */
function isLink(value: unknown): value is readonly [string, number] {
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

    const result = graph.safeParse(value)

    if (!result.success) {
        return { ok: false, reason: 'invalid-node' }
    }

    return { ok: true, graph: result.data }
}

export function validateMapping(value: Graph, schema: ConfigSchema): MappingIssue[] {
    const issues: MappingIssue[] = []

    for (const field of generatorFields) {
        const binding = schema[field]

        /* NOTE: 沒綁定是合法狀態，不是問題。 */
        if (!binding) {
            continue
        }

        const issue = (reason: MappingIssueReason): MappingIssue => ({
            field,
            reason,
            nodeId: binding.nodeId,
            input: binding.input,
        })

        const target = value[binding.nodeId]

        if (!target) {
            issues.push(issue('node-missing'))
            continue
        }

        if (!(binding.input in target.inputs)) {
            issues.push(issue('input-missing'))
            continue
        }

        if (isLink(target.inputs[binding.input])) {
            issues.push(issue('input-linked'))
        }
    }

    return issues
}

/*
 * NOTE:
 * _meta.title 優先，沒有才用 class_type；值是連線的 input 排除掉。
 * 這個 mapper 目前仍由 shared façade 匯出，避免擴大 Web ownership 的 migration。
 */
export function toNodeOptions(value: Graph): NodeOption[] {
    return Object.entries(value).map(([nodeId, target]) => ({
        nodeId,
        label: target._meta?.title?.trim() || target.class_type,
        classType: target.class_type,
        inputs: Object.entries(target.inputs)
            .filter(([, input]) => !isLink(input))
            .map(([input]) => input),
    }))
}

/* MARK: inferred types */

export type Graph = z.output<typeof graph>
export type MappingIssueReason = z.output<typeof mappingIssueReason>
export type MappingIssue = z.output<typeof mappingIssue>

export type ParseApiGraphFailure = 'not-object' | 'ui-format' | 'invalid-node'
type ParseApiGraphResult =
    | { ok: true, graph: Graph }
    | { ok: false, reason: ParseApiGraphFailure }

export type NodeOption = {
    nodeId: string
    label: string
    classType: string
    inputs: readonly string[]
}
