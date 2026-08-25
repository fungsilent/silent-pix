import { workflowApi } from '@silent-pix/shared'

import type { WorkflowApi } from '@silent-pix/shared'

export type GraphParse =
    | { status: 'empty' }
    | { status: 'invalid-json', message: string }
    | { status: 'invalid-graph', reason: WorkflowApi.ParseApiGraphFailure }
    | { status: 'ok', graph: WorkflowApi.ComfyGraph, text: string }

/*
 * 貼上之後一律用 JSON.stringify(_, null, 2) 重新排版。原始排版對機器產生的 JSON
 * 沒有價值，但固定排版讓 gutter 能精確算出「哪個 input 在第幾行」——
 * 否則遇到壓縮過的 JSON 就整個對不上。
 */
export function parseGraphText(text: string): GraphParse {
    if (text.trim().length === 0) {
        return { status: 'empty' }
    }

    let value: unknown

    try {
        value = JSON.parse(text)
    }
    catch (error) {
        return {
            status: 'invalid-json',
            message: error instanceof Error ? error.message : 'The text is not valid JSON.',
        }
    }

    const result = workflowApi.parseApiGraph(value)

    if (!result.ok) {
        return { status: 'invalid-graph', reason: result.reason }
    }

    return {
        status: 'ok',
        graph: result.graph,
        text: JSON.stringify(result.graph, null, 2),
    }
}

/*
 * 只在上面那個正規化過的排版上成立：node id 縮排 2、inputs 縮排 4、input key 縮排 6。
 * 這是我們自己產生的字串，所以可以這樣讀。
 */
const nodeLinePattern = /^ {2}"((?:[^"\\]|\\.)*)": \{$/
const inputLinePattern = /^ {6}"((?:[^"\\]|\\.)*)":/
const inputsOpenPattern = /^ {4}"inputs": \{$/
const nodeClosePattern = /^ {2}\}/

export type InputLines = Map<string, Map<string, number>>

export function toInputLines(text: string): InputLines {
    const lines = text.split('\n')
    const result: InputLines = new Map()
    let node: Map<string, number> | undefined
    let insideInputs = false

    lines.forEach((line, index) => {
        const nodeMatch = nodeLinePattern.exec(line)

        if (nodeMatch?.[1] !== undefined) {
            node = new Map()
            insideInputs = false
            result.set(JSON.parse(`"${nodeMatch[1]}"`) as string, node)
            return
        }

        if (!node) {
            return
        }

        if (inputsOpenPattern.test(line)) {
            insideInputs = true
            return
        }

        if (nodeClosePattern.test(line)) {
            node = undefined
            insideInputs = false
            return
        }

        if (!insideInputs) {
            return
        }

        const inputMatch = inputLinePattern.exec(line)

        if (inputMatch?.[1] !== undefined) {
            node.set(JSON.parse(`"${inputMatch[1]}"`) as string, index + 1)
        }
    })

    return result
}

export type LineMark = {
    field: WorkflowApi.GeneratorField
    broken: boolean
}

/*
 * 綁定的行號 → 標記。node 或 input 整個不見的綁定沒有行可以標，
 * 那些只會出現在 issue 清單裡。
 */
export function toLineMarks(
    text: string,
    schema: WorkflowApi.ConfigSchema,
    issues: WorkflowApi.MappingIssue[],
): Map<number, LineMark> {
    const inputLines = toInputLines(text)
    const brokenFields = new Set(issues.map(issue => issue.field))
    const marks = new Map<number, LineMark>()

    for (const definition of workflowApi.generatorFieldDefinitions) {
        const binding = schema[definition.field]

        if (!binding) {
            continue
        }

        const line = inputLines.get(binding.nodeId)?.get(binding.input)

        if (line === undefined) {
            continue
        }

        marks.set(line, {
            field: definition.field,
            broken: brokenFields.has(definition.field),
        })
    }

    return marks
}
