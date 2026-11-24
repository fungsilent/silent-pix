import { z } from 'zod'

import { generatorField, generatorFields } from '#shared/contract/workflow/config'

import type { ConfigSchema } from '#shared/contract/workflow/config'

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
 * 所以放這裡（graph -> config 單向相依），不另開 module。
 */
export const mappingIssue = z.object({
    field: generatorField,
    reason: mappingIssueReason,
    nodeId: z.string(),
    input: z.string(),
})

/* MARK: helpers */

/* NOTE: ComfyUI 的 API format 裡，一個 input 的值若是 [nodeId, slot] 就代表它接了線。 */
export function isGraphLink(value: unknown): value is readonly [string, number] {
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

        if (isGraphLink(target.inputs[binding.input])) {
            issues.push(issue('input-linked'))
        }
    }

    return issues
}

type WorkflowDefinition = { graph: Graph, configSchema: ConfigSchema }

export function sameWorkflowDefinition(left: WorkflowDefinition, right: WorkflowDefinition): boolean {
    return JSON.stringify(normalizeJson(left.graph)) === JSON.stringify(normalizeJson(right.graph))
        && JSON.stringify(normalizeJson(left.configSchema)) === JSON.stringify(normalizeJson(right.configSchema))
}

/* NOTE: Object key order does not change a Workflow revision. Array order is significant. */
function normalizeJson(value: unknown): unknown {
    if (Array.isArray(value)) return value.map(normalizeJson)
    if (!value || typeof value !== 'object') return value

    const object = value as Record<string, unknown>
    return Object.fromEntries(Object.keys(object).sort().map(key => [key, normalizeJson(object[key])]))
}

/* MARK: inferred types */

export type Graph = z.output<typeof graph>
export type MappingIssueReason = z.output<typeof mappingIssueReason>
export type MappingIssue = z.output<typeof mappingIssue>

export type ParseApiGraphFailure = 'not-object' | 'ui-format' | 'invalid-node'
type ParseApiGraphResult =
    | { ok: true, graph: Graph }
    | { ok: false, reason: ParseApiGraphFailure }
