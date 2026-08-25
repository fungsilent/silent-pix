import { RangeSetBuilder } from '@codemirror/state'
import { Decoration, ViewPlugin } from '@codemirror/view'

import type { Line } from '@codemirror/state'
import type { DecorationSet, EditorView, ViewUpdate } from '@codemirror/view'

/*
 * 只需要四種顏色（node id / key / value / 標點），為此裝 @codemirror/lang-json
 * 會連帶拉進 @codemirror/language 與 @lezer/json。文字是我們正規化過的 JSON，
 * 逐行掃一遍就夠——跟 prompt.token.ts 同一個做法。
 *
 * 這裡不參與任何驗證：真相永遠是 JSON.parse() + parseApiGraph()。
 */

const nodeIdMark = Decoration.mark({ class: 'cm-workflow-node-id' })
const keyMark = Decoration.mark({ class: 'cm-workflow-key' })
const stringMark = Decoration.mark({ class: 'cm-workflow-string' })
const numberMark = Decoration.mark({ class: 'cm-workflow-number' })
const literalMark = Decoration.mark({ class: 'cm-workflow-literal' })

const literalPattern = /^(?:true|false|null)/

function indentOf(text: string): number {
    return text.length - text.trimStart().length
}

/* 回傳字串 token 的結束位置（含結尾引號）；沒有收尾就吃到行尾 */
function scanString(text: string, start: number): number {
    let index = start + 1

    while (index < text.length) {
        if (text[index] === '\\') {
            index += 2
            continue
        }

        if (text[index] === '"') {
            return index + 1
        }

        index += 1
    }

    return text.length
}

function isKeyAt(text: string, end: number): boolean {
    let index = end

    while (index < text.length && text[index] === ' ') {
        index += 1
    }

    return text[index] === ':'
}

function addLineTokens(builder: RangeSetBuilder<Decoration>, line: Line): void {
    const text = line.text
    const indent = indentOf(text)
    let index = 0

    while (index < text.length) {
        const character = text[index]

        if (character === '"') {
            const end = scanString(text, index)
            const key = isKeyAt(text, end)
            /* 縮排 2 的 key 就是 node id —— 那是使用者要綁的東西，給它 accent */
            const mark = key ? (indent === 2 ? nodeIdMark : keyMark) : stringMark

            builder.add(line.from + index, line.from + end, mark)
            index = end
            continue
        }

        if (character !== undefined && (/[0-9]/.test(character) || (character === '-' && /[0-9]/.test(text[index + 1] ?? '')))) {
            let end = index + 1

            while (end < text.length && /[0-9.eE+-]/.test(text[end] ?? '')) {
                end += 1
            }

            builder.add(line.from + index, line.from + end, numberMark)
            index = end
            continue
        }

        const literal = literalPattern.exec(text.slice(index))

        if (literal) {
            builder.add(line.from + index, line.from + index + literal[0].length, literalMark)
            index += literal[0].length
            continue
        }

        index += 1
    }
}

function buildTokens(view: EditorView): DecorationSet {
    const builder = new RangeSetBuilder<Decoration>()

    for (const range of view.visibleRanges) {
        let position = range.from

        while (position <= range.to) {
            const line = view.state.doc.lineAt(position)
            addLineTokens(builder, line)
            position = line.to + 1
        }
    }

    return builder.finish()
}

export const workflowTokens = ViewPlugin.fromClass(
    class {
        decorations: DecorationSet

        constructor(view: EditorView) {
            this.decorations = buildTokens(view)
        }

        update(update: ViewUpdate) {
            if (update.docChanged || update.viewportChanged) {
                this.decorations = buildTokens(update.view)
            }
        }
    },
    { decorations: plugin => plugin.decorations },
)
