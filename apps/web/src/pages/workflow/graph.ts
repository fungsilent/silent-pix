import { comfy } from '@silent-pix/shared'

import { t } from '#/lib/i18n'

import type { Comfy } from '@silent-pix/shared'

export type GraphParse =
    | { status: 'empty' }
    | { status: 'invalid-json', message: string }
    | { status: 'invalid-graph', reason: Comfy.ParseApiGraphFailure }
    | { status: 'ok', graph: Comfy.Graph }

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
            message: error instanceof Error ? error.message : t('workflow.graph.invalidJson'),
        }
    }

    const result = comfy.parseApiGraph(value)

    if (!result.ok) {
        return { status: 'invalid-graph', reason: result.reason }
    }

    return { status: 'ok', graph: result.graph }
}
