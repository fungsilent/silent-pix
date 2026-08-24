import { StateEffect, StateField } from '@codemirror/state'
import { Decoration, EditorView, keymap, ViewPlugin } from '@codemirror/view'

import { toggleTokenAt, toggleTokenAtCursor } from '#/pages/generate/components/workspace/generate/prompt/prompt.command'
import { isTokenDisabled, tokensInRange } from '#/pages/generate/components/workspace/generate/prompt/prompt.document'
import { promptMeta } from '#/pages/generate/components/workspace/generate/prompt/prompt.state'

import type { Extension, Range } from '@codemirror/state'
import type { DecorationSet, ViewUpdate } from '@codemirror/view'

/* MARK: alt state */

const setAltHeld = StateEffect.define<boolean>()

/*
 * 按住 Alt 時才把每個 token 標起來，讓它們可以 hover。
 * 平常不標，避免在沒有互動的情況下替每個 tag 都掛一個 span。
 */
const altHeldField = StateField.define<boolean>({
    create() {
        return false
    },
    update(value, transaction) {
        for (const effect of transaction.effects) {
            if (effect.is(setAltHeld)) return effect.value
        }
        return value
    },
})

/* MARK: decorations */

const disabledToken = Decoration.mark({ class: 'cm-prompt-token-off' })
const hoverableToken = Decoration.mark({ class: 'cm-prompt-token' })

function tokenDecorations(view: EditorView): DecorationSet {
    const meta = promptMeta(view.state)
    const altHeld = view.state.field(altHeldField)
    if (meta.disabledTokens.length === 0 && !altHeld) return Decoration.none

    const decorations: Range<Decoration>[] = []

    for (const visible of view.visibleRanges) {
        for (const token of tokensInRange(meta, view.state.doc, visible.from, visible.to)) {
            if (altHeld) {
                decorations.push(hoverableToken.range(token.contentFrom, token.contentTo))
            }
            if (isTokenDisabled(meta, token)) {
                decorations.push(disabledToken.range(token.contentFrom, token.contentTo))
            }
        }
    }

    decorations.sort((a, b) => a.from - b.from || a.to - b.to)
    return Decoration.set(decorations, true)
}

const tokenDecorationPlugin = ViewPlugin.fromClass(class {
    decorations: DecorationSet

    constructor(view: EditorView) {
        this.decorations = tokenDecorations(view)
    }

    update(update: ViewUpdate) {
        const metaChanged = promptMeta(update.startState) !== promptMeta(update.state)
        const altChanged = update.startState.field(altHeldField) !== update.state.field(altHeldField)

        if (update.docChanged || update.viewportChanged || metaChanged || altChanged) {
            this.decorations = tokenDecorations(update.view)
        }

        if (altChanged) {
            update.view.dom.classList.toggle('cm-prompt-alt', update.state.field(altHeldField))
        }
    }
}, {
    decorations: plugin => plugin.decorations,
})

/* MARK: interaction */

function syncAlt(view: EditorView, held: boolean): void {
    if (view.state.field(altHeldField) === held) return
    view.dispatch({ effects: setAltHeld.of(held) })
}

const tokenInteraction = EditorView.domEventHandlers({
    /*
     * 普通 click 一律交還給 CodeMirror（定位游標／選取）。
     * 只有 Alt + 主鍵才 toggle，並且要 preventDefault —— 否則 CodeMirror
     * 會把 Alt-drag 當成矩形選取。
     */
    mousedown(event, view) {
        if (!event.altKey || event.button !== 0) return false

        const position = view.posAtCoords({ x: event.clientX, y: event.clientY })
        if (position === null) return false

        event.preventDefault()
        return toggleTokenAt(view, position)
    },

    keydown(event, view) {
        if (event.key === 'Alt') syncAlt(view, true)
        return false
    },

    keyup(event, view) {
        if (event.key === 'Alt') syncAlt(view, false)
        return false
    },

    /* 切走視窗時 keyup 不會來，離開編輯器就當作放開 */
    mouseleave(_event, view) {
        syncAlt(view, false)
        return false
    },

    blur(_event, view) {
        syncAlt(view, false)
        return false
    },
})

const tokenKeymap = keymap.of([
    { key: 'Mod-Shift-e', run: toggleTokenAtCursor },
])

/* MARK: extension */

export function promptTokens(): Extension {
    return [
        altHeldField,
        tokenDecorationPlugin,
        tokenInteraction,
        tokenKeymap,
    ]
}
