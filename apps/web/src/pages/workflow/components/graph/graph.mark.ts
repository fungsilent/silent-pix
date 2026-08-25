import { RangeSet, RangeSetBuilder, StateEffect, StateField } from '@codemirror/state'
import { Decoration, EditorView, gutter, GutterMarker } from '@codemirror/view'

import type { EditorState } from '@codemirror/state'
import type { DecorationSet } from '@codemirror/view'
import type { LineMark } from '#/pages/workflow/components/graph/graph.document'

export const setLineMarks = StateEffect.define<Map<number, LineMark>>()

/*
 * 被 field 綁走的行：gutter 顯示 field 名（文字色），textarea 上底色。
 * 綠＝綁定有效，紅＝這個綁定壞了。
 */
export const lineMarkField = StateField.define<Map<number, LineMark>>({
    create() {
        return new Map()
    },
    update(value, transaction) {
        for (const effect of transaction.effects) {
            if (effect.is(setLineMarks)) {
                return effect.value
            }
        }

        return value
    },
})

const boundLine = Decoration.line({ class: 'cm-workflow-bound' })
const brokenLine = Decoration.line({ class: 'cm-workflow-broken' })

function buildLineDecorations(state: EditorState): DecorationSet {
    const marks = state.field(lineMarkField)
    const builder = new RangeSetBuilder<Decoration>()

    for (const lineNumber of [...marks.keys()].sort((left, right) => left - right)) {
        if (lineNumber < 1 || lineNumber > state.doc.lines) {
            continue
        }

        const mark = marks.get(lineNumber)
        const line = state.doc.line(lineNumber)

        builder.add(line.from, line.from, mark?.broken ? brokenLine : boundLine)
    }

    return builder.finish()
}

export const lineMarkDecorations = StateField.define<DecorationSet>({
    create(state) {
        return buildLineDecorations(state)
    },
    update(value, transaction) {
        if (!transaction.docChanged && !transaction.effects.some(effect => effect.is(setLineMarks))) {
            return value
        }

        return buildLineDecorations(transaction.state)
    },
    provide: field => EditorView.decorations.from(field),
})

class FieldMarker extends GutterMarker {
    constructor(private readonly mark: LineMark) {
        super()
    }

    override eq(other: FieldMarker): boolean {
        return other.mark.field === this.mark.field && other.mark.broken === this.mark.broken
    }

    override toDOM(): HTMLElement {
        const element = document.createElement('span')

        element.className = this.mark.broken
            ? 'cm-workflow-field cm-workflow-field-broken'
            : 'cm-workflow-field'
        element.textContent = this.mark.field

        return element
    }
}

/* 沿用 prompt editor 的 group-name gutter：第二條 gutter，固定寬度 */
export const fieldGutter = gutter({
    class: 'cm-workflow-field-gutter',
    markers(view) {
        const marks = view.state.field(lineMarkField)

        if (marks.size === 0) {
            return RangeSet.empty
        }

        const builder = new RangeSetBuilder<GutterMarker>()

        for (const lineNumber of [...marks.keys()].sort((left, right) => left - right)) {
            if (lineNumber < 1 || lineNumber > view.state.doc.lines) {
                continue
            }

            const mark = marks.get(lineNumber)

            if (mark) {
                builder.add(view.state.doc.line(lineNumber).from, view.state.doc.line(lineNumber).from, new FieldMarker(mark))
            }
        }

        return builder.finish()
    },
})
