import { config } from '@silent-pix/shared'

import { getJsonPropertyLines } from '#/lib/json'
import { generatorFieldLabel } from '#/pages/workflow/generator-field'

import type { Comfy, ConfigSchema } from '@silent-pix/shared'

export type InputLines = Map<string, Map<string, number>>

export function toInputLines(text: string): InputLines {
    const result: InputLines = new Map()
    for (const [nodeId, node] of getJsonPropertyLines(text)) {
        const inputs = node.properties.get('inputs')?.properties
        result.set(nodeId, new Map(Array.from(inputs ?? [], ([name, property]) => [name, property.line])))
    }

    return result
}

export type LineMark = {
    label: string
    broken: boolean
}

/*
 * 綁定的行號 → 標記。node 或 input 整個不見的綁定沒有行可以標，
 * 那些只會出現在 issue 清單裡。
 */
export function toLineMarks(
    text: string,
    schema: ConfigSchema,
    issues: Comfy.MappingIssue[],
): Map<number, LineMark> {
    const inputLines = toInputLines(text)
    const brokenFields = new Set(issues.map(issue => issue.field))
    const marks = new Map<number, LineMark>()

    for (const field of config.generatorFields) {
        const binding = schema[field]

        if (!binding) {
            continue
        }

        const line = inputLines.get(binding.nodeId)?.get(binding.input)

        if (line === undefined) {
            continue
        }

        marks.set(line, {
            label: generatorFieldLabel(field),
            broken: brokenFields.has(field),
        })
    }

    return marks
}
