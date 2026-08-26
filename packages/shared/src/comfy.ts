import { z } from 'zod'

import { generatorField, generatorFieldDefinitions } from '#shared/config'

import type { ConfigSchema } from '#shared/config'

/* MARK: graph */

export const node = z.looseObject({
    class_type: z.string().min(1),
    inputs: z.record(z.string(), z.unknown()),
    _meta: z.looseObject({ title: z.string().optional() }).optional(),
})

export type Node = z.output<typeof node>

export const graph = z.record(z.string().min(1), node)

export type Graph = z.output<typeof graph>

export type ParseApiGraphFailure = 'not-object' | 'ui-format' | 'invalid-node'

export type ParseApiGraphResult =
    | { ok: true, graph: Graph }
    | { ok: false, reason: ParseApiGraphFailure }

/* ComfyUI 的 API format 裡，一個 input 的值若是 [nodeId, slot] 就代表它接了線*/
export function isLink(value: unknown): value is readonly [string, number] {
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

/* MARK: mapping validation */

/*
 * 綁定驗證是 graph 與 config 的交界：規則要同時認得兩邊，
 * 所以放這裡（comfy -> config 單向相依），不另開 module。
 */
export const mappingIssueReason = z.enum(['node-missing', 'input-missing', 'input-linked'])

export type MappingIssueReason = z.output<typeof mappingIssueReason>

/* schema 是 runtime 的唯一真相，型別從它衍生，不另外手寫一份 */
export const mappingIssue = z.object({
    field: generatorField,
    reason: mappingIssueReason,
    nodeId: z.string(),
    input: z.string(),
})

export type MappingIssue = z.output<typeof mappingIssue>

export function validateMapping(value: Graph, schema: ConfigSchema): MappingIssue[] {
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

/* MARK: node options */

export type NodeOption = {
    nodeId: string
    /* _meta.title 優先，沒有才用 class_type —— 使用者改過名的節點好認得多 */
    label: string
    classType: string
    /* 值是連線的 input 排除掉：選了也寫不進去 */
    inputs: readonly string[]
}

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
