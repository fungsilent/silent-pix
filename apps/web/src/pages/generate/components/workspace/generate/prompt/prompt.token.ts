import { StateEffect, StateField } from '@codemirror/state'
import { Decoration, EditorView, keymap, layer, ViewPlugin } from '@codemirror/view'

import { groupTokens, isTokenDraggable, moveToken, toggleTokenAt, toggleTokenAtCursor } from '#/pages/generate/components/workspace/generate/prompt/prompt.command'
import { groupEnd, isTokenDisabled, tokenAt, tokensInRange } from '#/pages/generate/components/workspace/generate/prompt/prompt.document'
import { promptMeta } from '#/pages/generate/components/workspace/generate/prompt/prompt.state'

import type { Extension, Range } from '@codemirror/state'
import type { DecorationSet, LayerMarker, ViewUpdate } from '@codemirror/view'
import type { TokenDropTarget } from '#/pages/generate/components/workspace/generate/prompt/prompt.command'

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

        if (dragChanged(update)) {
            update.view.dom.classList.toggle('cm-prompt-drop-group', update.state.field(tokenDragField) !== null)
        }
    }
}, {
    decorations: plugin => plugin.decorations,
})

/* MARK: drag state */

type TokenDrag = { source: number, target: TokenDropTarget | null } | null

const setTokenDrag = StateEffect.define<TokenDrag>()

const tokenDragField = StateField.define<TokenDrag>({
    create() {
        return null
    },
    update(value, transaction) {
        for (const effect of transaction.effects) {
            if (effect.is(setTokenDrag)) return effect.value
        }
        return value
    },
})

function dragChanged(update: ViewUpdate): boolean {
    return update.startState.field(tokenDragField) !== update.state.field(tokenDragField)
}

/*
 * 落點指示器是 2px 直立 caret，落在逗號縫上 —— 跟 group move 的全寬橫線
 * 刻意不同軸，兩種拖曳並存時不會認錯。
 */
class CaretMarker implements LayerMarker {
    constructor(readonly left: number, readonly top: number, readonly height: number) {}

    eq(other: LayerMarker): boolean {
        return other instanceof CaretMarker
            && other.left === this.left
            && other.top === this.top
            && other.height === this.height
    }

    draw(): HTMLElement {
        const element = document.createElement('div')
        element.className = 'cm-prompt-token-caret'
        this.adjust(element)
        return element
    }

    update(dom: HTMLElement): boolean {
        this.adjust(dom)
        return true
    }

    private adjust(element: HTMLElement): void {
        element.style.left = `${this.left}px`
        element.style.top = `${this.top}px`
        element.style.height = `${this.height}px`
    }
}

/* 把 drop target 換算成文件位置，好畫 caret */
function caretPosition(view: EditorView, target: TokenDropTarget): number | undefined {
    const meta = promptMeta(view.state)
    const index = meta.groups.findIndex(group => group.id === target.groupId)
    if (index < 0) return undefined

    const tokens = groupTokens(meta, view.state.doc, index)
    const before = tokens[target.beforeIndex]
    if (before) return before.contentFrom

    const last = tokens[tokens.length - 1]
    return last ? last.rawTo : meta.groups[index]?.start
}

const tokenCaretLayer = layer({
    above: true,
    class: 'cm-prompt-token-caret-layer',

    update(update) {
        return update.docChanged || update.viewportChanged || update.geometryChanged || dragChanged(update)
    },

    markers(view) {
        const drag = view.state.field(tokenDragField)
        if (!drag?.target) return []

        const position = caretPosition(view, drag.target)
        if (position === undefined) return []

        const coords = view.coordsAtPos(position)
        if (!coords) return []

        const scrollRect = view.scrollDOM.getBoundingClientRect()
        const baseTop = scrollRect.top - view.scrollDOM.scrollTop
        const baseLeft = scrollRect.left - view.scrollDOM.scrollLeft

        return [new CaretMarker(
            coords.left - baseLeft - 1,
            coords.top - baseTop,
            coords.bottom - coords.top,
        )]
    },
})

/* MARK: interaction */

/*
 * blur 有可能是 DOM 重繪順帶觸發的，那時候還在 update 裡；延後一拍再 dispatch，
 * 避免撞上 CodeMirror 的 "update in progress"。
 */
function syncAlt(view: EditorView, held: boolean): void {
    if (view.state.field(altHeldField) === held) return
    setTimeout(() => {
        if (view.state.field(altHeldField) === held) return
        view.dispatch({ effects: setAltHeld.of(held) })
    }, 0)
}

const dragThreshold = 4
const scrollZone = 40

/* 目前 selection 是否剛好等於某個 token —— 只有這種情況才允許開始拖曳 */
function selectedToken(view: EditorView) {
    const selection = view.state.selection.main
    if (selection.empty) return undefined

    const hit = tokenAt(promptMeta(view.state), view.state.doc, selection.from)
    if (!hit) return undefined
    if (hit.token.contentFrom !== selection.from || hit.token.contentTo !== selection.to) return undefined
    return hit
}

/* 指標位置 → drop target：先看是不是落在 group name cell，再退回逗號縫 */
function dropTargetAt(view: EditorView, clientX: number, clientY: number): TokenDropTarget | null {
    const element = document.elementFromPoint(clientX, clientY)
    const cell = element instanceof HTMLElement ? element.closest('.cm-prompt-group-cell[data-group-id]') : null
    const meta = promptMeta(view.state)

    if (cell instanceof HTMLElement && view.dom.contains(cell)) {
        const groupId = cell.dataset.groupId
        const index = meta.groups.findIndex(group => group.id === groupId)
        if (index >= 0 && groupId) {
            /* 落在 group name cell = 接到該組結尾 */
            return { groupId, beforeIndex: groupTokens(meta, view.state.doc, index).length }
        }
    }

    const position = view.posAtCoords({ x: clientX, y: clientY })
    if (position === null) return null

    const groupIndex = meta.groups.findIndex((group, index) => (
        group.start <= position && position <= groupEnd(meta, index, view.state.doc.length)
    ))
    if (groupIndex < 0) return null

    const group = meta.groups[groupIndex]
    if (!group) return null

    const tokens = groupTokens(meta, view.state.doc, groupIndex)
    /* 落在最靠近的逗號縫：離哪個 token 的起點近就插在它前面 */
    let beforeIndex = tokens.length
    for (let index = 0; index < tokens.length; index += 1) {
        const token = tokens[index]!
        if (position <= (token.contentFrom + token.contentTo) / 2) {
            beforeIndex = index
            break
        }
    }

    return { groupId: group.id, beforeIndex }
}

function startTokenDrag(view: EditorView, source: number, content: string, startX: number, startY: number): void {
    let active = false
    let ghost: HTMLElement | undefined
    let frame = 0
    let pointerY = startY

    /*
     * 邊緣自動捲動必須用 rAF，不能靠 mousemove —— 指標停在邊緣不動時
     * mousemove 不會再觸發，捲動就會停住。
     */
    const step = () => {
        frame = requestAnimationFrame(step)
        const rect = view.scrollDOM.getBoundingClientRect()
        const top = pointerY - rect.top
        const bottom = rect.bottom - pointerY
        let delta = 0
        if (top < scrollZone) delta = -(scrollZone - Math.max(top, 0)) / 4
        else if (bottom < scrollZone) delta = (scrollZone - Math.max(bottom, 0)) / 4
        if (delta !== 0) view.scrollDOM.scrollTop += delta
    }

    const cleanup = () => {
        window.removeEventListener('mousemove', onMove)
        window.removeEventListener('mouseup', onUp)
        window.removeEventListener('keydown', onKey)
        if (frame) cancelAnimationFrame(frame)
        frame = 0
        ghost?.remove()
        ghost = undefined
    }

    const clear = () => {
        cleanup()
        if (view.state.field(tokenDragField)) {
            view.dispatch({ effects: setTokenDrag.of(null) })
        }
    }

    function onMove(event: MouseEvent) {
        pointerY = event.clientY

        if (!active) {
            if (Math.abs(event.clientX - startX) + Math.abs(event.clientY - startY) < dragThreshold) return
            active = true
            ghost = document.createElement('div')
            ghost.className = 'cm-prompt-token-ghost'
            ghost.textContent = content
            document.body.append(ghost)
            frame = requestAnimationFrame(step)
        }

        if (ghost) {
            ghost.style.left = `${event.clientX + 12}px`
            ghost.style.top = `${event.clientY + 10}px`
        }

        view.dispatch({ effects: setTokenDrag.of({ source, target: dropTargetAt(view, event.clientX, event.clientY) }) })
    }

    function onUp() {
        const drag = view.state.field(tokenDragField)
        clear()
        if (!active || !drag?.target) return
        moveToken(view, source, drag.target)
    }

    function onKey(event: KeyboardEvent) {
        if (event.key === 'Escape') clear()
    }

    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    window.addEventListener('keydown', onKey)
}

const tokenInteraction = EditorView.domEventHandlers({
    /*
     * 普通 click 一律交還給 CodeMirror（定位游標／選取）。
     * 只有 Alt + 主鍵才 toggle，並且要 preventDefault —— 否則 CodeMirror
     * 會把 Alt-drag 當成矩形選取。
     */
    mousedown(event, view) {
        if (event.button !== 0) return false

        if (event.altKey) {
            const position = view.posAtCoords({ x: event.clientX, y: event.clientY })
            if (position === null) return false
            event.preventDefault()
            return toggleTokenAt(view, position)
        }

        /*
         * 只有「已經雙擊選取整個 token」之後，在它身上按下才進入拖曳。
         * 其餘情況一律交還給 CodeMirror，普通的文字選取不受影響。
         */
        const hit = selectedToken(view)
        if (!hit) return false

        const position = view.posAtCoords({ x: event.clientX, y: event.clientY })
        if (position === null || position < hit.token.contentFrom || position > hit.token.contentTo) return false
        if (!isTokenDraggable(view.state.doc, hit.token)) return false

        event.preventDefault()
        startTokenDrag(
            view,
            hit.token.contentFrom,
            view.state.doc.sliceString(hit.token.contentFrom, hit.token.contentTo),
            event.clientX,
            event.clientY,
        )
        return true
    },

    /* 雙擊選取整個 token，而不是 CodeMirror 預設的「一個字」 */
    dblclick(event, view) {
        if (event.button !== 0) return false

        const position = view.posAtCoords({ x: event.clientX, y: event.clientY })
        if (position === null) return false

        const hit = tokenAt(promptMeta(view.state), view.state.doc, position)
        if (!hit) return false

        event.preventDefault()
        view.dispatch({ selection: { anchor: hit.token.contentFrom, head: hit.token.contentTo } })
        return true
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
        tokenDragField,
        tokenDecorationPlugin,
        tokenCaretLayer,
        tokenInteraction,
        tokenKeymap,
    ]
}
