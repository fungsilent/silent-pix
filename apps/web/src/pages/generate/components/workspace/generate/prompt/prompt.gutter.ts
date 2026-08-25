import { RangeSet, StateEffect, StateField } from '@codemirror/state'
import { Decoration, gutter, GutterMarker, layer, lineNumberMarkers, lineNumbers, ViewPlugin } from '@codemirror/view'

import { createGroup, lineRange, moveGroup, removeGroupBoundary, renameGroup, toggleGroup } from '#/pages/generate/components/workspace/generate/prompt/prompt.command'
import { groupEnd } from '#/pages/generate/components/workspace/generate/prompt/prompt.document'
import { promptMeta } from '#/pages/generate/components/workspace/generate/prompt/prompt.state'

import type { Extension, Range, RangeSet as RangeSetType } from '@codemirror/state'
import type { DecorationSet, EditorView, LayerMarker, ViewUpdate } from '@codemirror/view'
import type { PromptEditorGroup, PromptEditorMeta } from '#/pages/generate/components/workspace/generate/prompt/prompt.document'

/* MARK: transient UI state */

type PendingRange = { fromLine: number, toLine: number } | null

type DragState = { groupId: string, targetIndex: number } | null

const setPendingRange = StateEffect.define<PendingRange>()
const setRenaming = StateEffect.define<string | null>()
const setDragState = StateEffect.define<DragState>()

/* 拖曳中的預覽範圍。純 UI，不進 document metadata，也不進 history。 */
const pendingRangeField = StateField.define<PendingRange>({
    create() {
        return null
    },
    update(value, transaction) {
        for (const effect of transaction.effects) {
            if (effect.is(setPendingRange)) return effect.value
        }
        return value
    },
})

/* 正在 inline rename 的 group id。同上，純 UI。 */
const renamingField = StateField.define<string | null>({
    create() {
        return null
    },
    update(value, transaction) {
        for (const effect of transaction.effects) {
            if (effect.is(setRenaming)) return effect.value
        }
        return value
    },
})

/* 正在拖曳的 group 與目前的落點。純 UI，不進 history。 */
const dragStateField = StateField.define<DragState>({
    create() {
        return null
    },
    update(value, transaction) {
        for (const effect of transaction.effects) {
            if (effect.is(setDragState)) return effect.value
        }
        return value
    },
})

/* MARK: shared */

function metaChanged(update: ViewUpdate): boolean {
    return promptMeta(update.startState) !== promptMeta(update.state)
}

function uiChanged(update: ViewUpdate): boolean {
    return update.startState.field(pendingRangeField) !== update.state.field(pendingRangeField)
        || update.startState.field(renamingField) !== update.state.field(renamingField)
        || update.startState.field(dragStateField) !== update.state.field(dragStateField)
}

function groupRanges(meta: PromptEditorMeta, docLength: number) {
    return meta.groups.map((group, index) => ({
        group,
        from: group.start,
        to: groupEnd(meta, index, docLength),
    }))
}

function clampLine(line: number, lines: number): number {
    return Math.min(Math.max(line, 1), lines)
}

/* MARK: group name gutter */

type GroupCellOptions = {
    group: PromptEditorGroup
    renaming: boolean
    removable: boolean
}

class GroupNameMarker extends GutterMarker {
    constructor(private readonly options: GroupCellOptions) {
        super()
    }

    eq(other: GroupNameMarker): boolean {
        return other.options.group.id === this.options.group.id
            && other.options.group.name === this.options.group.name
            && other.options.group.enabled === this.options.group.enabled
            && other.options.renaming === this.options.renaming
            && other.options.removable === this.options.removable
    }

    toDOM(view: EditorView): Node {
        const { group, renaming, removable } = this.options
        const root = document.createElement('div')
        root.className = 'cm-prompt-group-cell'
        root.dataset.groupId = group.id
        root.dataset.renaming = String(renaming)

        if (renaming) {
            root.append(renameInput(view, group))
            return root
        }

        const dot = document.createElement('span')
        dot.className = 'cm-prompt-group-dot'
        dot.dataset.enabled = String(group.enabled)
        dot.setAttribute('role', 'button')
        dot.setAttribute('aria-pressed', String(group.enabled))
        dot.setAttribute('aria-label', `${group.enabled ? 'Disable' : 'Enable'} ${group.name}`)

        const name = document.createElement('span')
        name.className = 'cm-prompt-group-name'
        name.textContent = group.name
        /* 固定欄寬下長名字會被截斷，補一個原生 tooltip */
        name.title = group.name

        root.append(dot, name)

        if (removable) {
            const remove = document.createElement('button')
            remove.className = 'cm-prompt-group-remove'
            remove.type = 'button'
            remove.textContent = '−'
            remove.title = 'Remove group boundary'
            remove.setAttribute('aria-label', `Remove ${group.name} boundary`)
            root.append(remove)
        }

        return root
    }
}

/*
 * Rename input 是唯一允許取得 DOM focus 的 gutter control（plan risk 5）。
 * 它絕對定位覆蓋整個 cell，不參與尺寸計算，所以文字左緣不會位移。
 */
function renameInput(view: EditorView, group: PromptEditorGroup): HTMLInputElement {
    const input = document.createElement('input')
    input.className = 'cm-prompt-group-rename'
    input.value = group.name
    input.spellcheck = false
    input.setAttribute('aria-label', `Rename ${group.name}`)

    /*
     * Enter/Escape 走完之後 marker 會重繪，input 被移出 DOM 就會補一個 blur。
     * 那個 blur 落在同一次 update 裡，再 dispatch 會撞上 CodeMirror 的
     * "update in progress"，所以先立旗標讓它自己跳過。
     */
    let settled = false
    const close = () => {
        settled = true
        view.dispatch({ effects: setRenaming.of(null) })
    }

    input.addEventListener('mousedown', event => event.stopPropagation())

    input.addEventListener('keydown', event => {
        if (event.key === 'Enter') {
            event.preventDefault()
            settled = true
            renameGroup(view, group.id, input.value)
            close()
            view.focus()
            return
        }

        if (event.key === 'Escape') {
            event.preventDefault()
            close()
            view.focus()
        }
    })

    /* 點到別處也視為提交；空字串不提交，group 保留原名 */
    input.addEventListener('blur', () => {
        if (settled) return
        if (view.state.field(renamingField) !== group.id) return
        settled = true

        /* blur 可能是 DOM 重繪帶出來的，延後一拍才 dispatch 才不會撞進 update */
        const value = input.value
        setTimeout(() => {
            renameGroup(view, group.id, value)
            if (view.state.field(renamingField) === group.id) close()
        }, 0)
    })

    setTimeout(() => {
        input.focus()
        input.select()
    }, 0)

    return input
}

const blankMarker = new class extends GutterMarker {
    eq(): boolean {
        return true
    }

    toDOM(): Node {
        const root = document.createElement('div')
        root.className = 'cm-prompt-group-cell'
        return root
    }
}()

const groupNameGutter = gutter({
    class: 'cm-prompt-group-gutter',
    renderEmptyElements: true,

    lineMarker(view, line) {
        const meta = promptMeta(view.state)
        const group = meta.groups.find(item => item.start === line.from)
        if (!group) return blankMarker

        return new GroupNameMarker({
            group,
            renaming: view.state.field(renamingField) === group.id,
            removable: meta.groups.length > 1,
        })
    },

    lineMarkerChange(update) {
        return metaChanged(update) || uiChanged(update)
    },

    initialSpacer() {
        return blankMarker
    },

    domEventHandlers: {
        /*
         * mousedown 而非 click：preventDefault 才能保住 editor selection。
         * Rename 進行中時整個 cell 停用 dot / remove / double-click。
         */
        mousedown(view, line, event) {
            if (!(event.target instanceof HTMLElement)) return false
            if (view.state.field(renamingField) !== null) return false

            const meta = promptMeta(view.state)
            const group = meta.groups.find(item => item.start === line.from)
            if (!group) return false

            if (event.target.closest('.cm-prompt-group-remove')) {
                event.preventDefault()
                return removeGroupBoundary(view, group.id)
            }

            if (event.target.closest('.cm-prompt-group-dot')) {
                event.preventDefault()
                return toggleGroup(view, group.id)
            }

            /* 其餘的 cell 區域本身就是 Move 的 drag handle，沒有另外的 Move icon */
            if (event instanceof MouseEvent && event.button === 0) {
                event.preventDefault()
                startGroupDrag(view, group.id, event.clientX, event.clientY)
            }

            return false
        },

        dblclick(view, line, event) {
            if (!(event.target instanceof HTMLElement)) return false
            if (event.target.closest('.cm-prompt-group-dot')) return false
            if (event.target.closest('.cm-prompt-group-remove')) return false

            const group = promptMeta(view.state).groups.find(item => item.start === line.from)
            if (!group) return false

            event.preventDefault()
            view.dispatch({ effects: setRenaming.of(group.id) })
            return true
        },
    },
})

/* MARK: group drag */

/*
 * Group name cell 本身就是 drag handle。4px threshold 之前什麼都不做，
 * 所以 double-click Rename 不會被誤觸成 Move。
 */
function boundaryTops(view: EditorView): number[] {
    const meta = promptMeta(view.state)
    const tops = meta.groups.map(group => view.documentTop + view.lineBlockAt(group.start).top)
    const lastLine = view.lineBlockAt(view.state.doc.length)
    tops.push(view.documentTop + lastLine.bottom)
    return tops
}

function nearestBoundary(view: EditorView, clientY: number): number {
    const tops = boundaryTops(view)
    let best = 0
    let bestDistance = Infinity

    tops.forEach((top, index) => {
        const distance = Math.abs(top - clientY)
        if (distance < bestDistance) {
            bestDistance = distance
            best = index
        }
    })

    return best
}

function createGhost(view: EditorView, groupId: string): HTMLElement {
    const group = promptMeta(view.state).groups.find(item => item.id === groupId)
    const ghost = document.createElement('div')
    ghost.className = 'cm-prompt-drag-ghost'

    const dot = document.createElement('span')
    dot.className = 'cm-prompt-group-dot'
    dot.dataset.enabled = String(group?.enabled ?? true)

    const name = document.createElement('span')
    name.textContent = group?.name ?? ''

    ghost.append(dot, name)
    document.body.append(ghost)
    return ghost
}

function startGroupDrag(view: EditorView, groupId: string, startX: number, startY: number): void {
    if (promptMeta(view.state).groups.length < 2) return

    let active = false
    let ghost: HTMLElement | undefined

    const cleanup = () => {
        window.removeEventListener('mousemove', onMove)
        window.removeEventListener('mouseup', onUp)
        window.removeEventListener('keydown', onKey)
        ghost?.remove()
        ghost = undefined
    }

    const clear = () => {
        cleanup()
        if (view.state.field(dragStateField)) {
            view.dispatch({ effects: setDragState.of(null) })
        }
    }

    function onMove(event: MouseEvent) {
        if (!active) {
            const moved = Math.abs(event.clientX - startX) + Math.abs(event.clientY - startY)
            if (moved < dragThreshold) return
            active = true
            ghost = createGhost(view, groupId)
        }

        if (ghost) {
            ghost.style.left = `${event.clientX + 12}px`
            ghost.style.top = `${event.clientY + 10}px`
        }

        const targetIndex = nearestBoundary(view, event.clientY)
        const current = view.state.field(dragStateField)
        if (current?.groupId !== groupId || current.targetIndex !== targetIndex) {
            view.dispatch({ effects: setDragState.of({ groupId, targetIndex }) })
        }
    }

    function onUp() {
        const state = view.state.field(dragStateField)
        clear()
        if (!active || !state) return
        moveGroup(view, groupId, state.targetIndex)
    }

    function onKey(event: KeyboardEvent) {
        if (event.key === 'Escape') clear()
    }

    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    window.addEventListener('keydown', onKey)
}

/* 落點指示器是全寬橫線，跟 PHASE 6 的 token 直立 caret 刻意不同軸 */
class DropLineMarker implements LayerMarker {
    constructor(
        readonly left: number,
        readonly top: number,
        readonly width: number,
    ) {}

    eq(other: LayerMarker): boolean {
        return other instanceof DropLineMarker
            && other.left === this.left
            && other.top === this.top
            && other.width === this.width
    }

    draw(): HTMLElement {
        const element = document.createElement('div')
        element.className = 'cm-prompt-drop-line'
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
        element.style.width = `${this.width}px`
    }
}

const dropLineLayer = layer({
    above: true,
    class: 'cm-prompt-drop-layer',

    update(update) {
        return update.docChanged || update.viewportChanged || update.geometryChanged || uiChanged(update)
    },

    markers(view) {
        const drag = view.state.field(dragStateField)
        if (!drag) return []

        const meta = promptMeta(view.state)
        const index = meta.groups.findIndex(group => group.id === drag.groupId)
        /* 落回原位不畫線，跟 moveGroup 的 no-op 條件一致 */
        if (drag.targetIndex === index || drag.targetIndex === index + 1) return []

        const scrollRect = view.scrollDOM.getBoundingClientRect()
        const baseTop = scrollRect.top - view.scrollDOM.scrollTop
        const baseLeft = scrollRect.left - view.scrollDOM.scrollLeft
        const contentRect = view.contentDOM.getBoundingClientRect()

        const target = meta.groups[drag.targetIndex]
        const top = target
            ? view.documentTop + view.lineBlockAt(target.start).top
            : view.documentTop + view.lineBlockAt(view.state.doc.length).bottom

        return [new DropLineMarker(
            contentRect.left - baseLeft,
            top - baseTop - 1,
            view.contentDOM.clientWidth,
        )]
    },
})

/* MARK: line gutter drag */

/*
 * 只能由 line-number gutter 開始。垂直位移超過 4px 才算 drag，
 * 否則視為普通點擊，不建立 group、也不產生 history event。
 */
const dragThreshold = 4

function startLineDrag(view: EditorView, anchorLine: number, startY: number): void {
    let active = false

    const lineAt = (clientY: number): number => {
        const position = view.posAtCoords({ x: view.contentDOM.getBoundingClientRect().left + 1, y: clientY }, false)
        return clampLine(view.state.doc.lineAt(position).number, view.state.doc.lines)
    }

    const preview = (headLine: number) => {
        view.dispatch({ effects: setPendingRange.of(lineRange(anchorLine, headLine)) })
    }

    const cleanup = () => {
        window.removeEventListener('mousemove', onMove)
        window.removeEventListener('mouseup', onUp)
        window.removeEventListener('keydown', onKey)
    }

    const cancel = () => {
        cleanup()
        view.dispatch({ effects: setPendingRange.of(null) })
    }

    function onMove(event: MouseEvent) {
        if (!active && Math.abs(event.clientY - startY) < dragThreshold) return
        active = true
        preview(lineAt(event.clientY))
    }

    function onUp(event: MouseEvent) {
        cleanup()
        const range = view.state.field(pendingRangeField)
        view.dispatch({ effects: setPendingRange.of(null) })

        if (!active || !range) return

        const created = createGroup(view, range.fromLine, range.toLine)
        if (created) {
            view.dispatch({ effects: setRenaming.of(created) })
        }
        event.preventDefault()
    }

    function onKey(event: KeyboardEvent) {
        if (event.key === 'Escape') cancel()
    }

    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    window.addEventListener('keydown', onKey)
}

const lineNumberGutter = lineNumbers({
    domEventHandlers: {
        mousedown(view, line, event) {
            if (!(event instanceof MouseEvent) || event.button !== 0) return false
            if (view.state.field(renamingField) !== null) return false

            event.preventDefault()
            startLineDrag(view, view.state.doc.lineAt(line.from).number, event.clientY)
            return true
        },
    },
})

/* 拖曳預覽的藍色選取只出現在 line-number gutter */
const pendingLineMarker = new class extends GutterMarker {
    elementClass = 'cm-prompt-line-pending'
}()

const pendingLineMarkers = lineNumberMarkers.compute([pendingRangeField, 'doc'], (state): RangeSetType<GutterMarker> => {
    const range = state.field(pendingRangeField)
    if (!range) return RangeSet.empty as RangeSetType<GutterMarker>

    const markers: Range<GutterMarker>[] = []
    for (let line = range.fromLine; line <= Math.min(range.toLine, state.doc.lines); line += 1) {
        markers.push(pendingLineMarker.range(state.doc.line(line).from))
    }

    return RangeSet.of<GutterMarker>(markers)
})

/* MARK: line decorations */

const disabledLine = Decoration.line({ class: 'cm-prompt-group-off' })
const pendingLine = Decoration.line({ class: 'cm-prompt-line-covered' })

function lineDecorations(view: EditorView): DecorationSet {
    const meta = promptMeta(view.state)
    const doc = view.state.doc
    const disabled = groupRanges(meta, doc.length).filter(range => !range.group.enabled)
    const pending = view.state.field(pendingRangeField)
    if (disabled.length === 0 && !pending) return Decoration.none

    const decorations: Range<Decoration>[] = []

    for (const visible of view.visibleRanges) {
        for (const range of disabled) {
            const from = Math.max(visible.from, range.from)
            const to = Math.min(visible.to, range.to)
            if (from > to) continue

            let position = doc.lineAt(from).from
            while (position <= to) {
                const line = doc.lineAt(position)
                decorations.push(disabledLine.range(line.from))
                if (line.to + 1 > doc.length) break
                position = line.to + 1
            }
        }
    }

    if (pending) {
        for (let line = pending.fromLine; line <= Math.min(pending.toLine, doc.lines); line += 1) {
            decorations.push(pendingLine.range(doc.line(line).from))
        }
    }

    decorations.sort((a, b) => a.from - b.from)
    return Decoration.set(decorations, true)
}

const lineDecorationPlugin = ViewPlugin.fromClass(class {
    decorations: DecorationSet

    constructor(view: EditorView) {
        this.decorations = lineDecorations(view)
    }

    update(update: ViewUpdate) {
        if (update.docChanged || update.viewportChanged || metaChanged(update) || uiChanged(update)) {
            this.decorations = lineDecorations(update.view)
        }
    }
}, {
    decorations: plugin => plugin.decorations,
})

/* MARK: disabled group hatch */

/*
 * 暗紋是蓋住整組首末行的單一矩形，不是逐行背景 —— 45° 條紋才會跨行連續。
 *
 * 每個 group 是獨立的 div，background 預設從自己的左上角起算，兩組相位會對不上。
 * 這裡把 background-position 綁到矩形在 document 座標系的位置，
 * 等於所有矩形共用同一個 pattern 原點。
 */
class HatchMarker implements LayerMarker {
    constructor(
        readonly left: number,
        readonly top: number,
        readonly width: number,
        readonly height: number,
    ) {}

    eq(other: LayerMarker): boolean {
        return other instanceof HatchMarker
            && other.left === this.left
            && other.top === this.top
            && other.width === this.width
            && other.height === this.height
    }

    draw(): HTMLElement {
        const element = document.createElement('div')
        element.className = 'cm-prompt-hatch'
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
        element.style.width = `${this.width}px`
        element.style.height = `${this.height}px`
        element.style.backgroundPosition = `${-this.left}px ${-this.top}px`
    }
}

const disabledHatchLayer = layer({
    above: false,
    class: 'cm-prompt-hatch-layer',

    update(update) {
        return update.docChanged || update.viewportChanged || update.geometryChanged || metaChanged(update)
    },

    markers(view) {
        const meta = promptMeta(view.state)
        const docLength = view.state.doc.length

        const scrollRect = view.scrollDOM.getBoundingClientRect()
        const baseTop = scrollRect.top - view.scrollDOM.scrollTop
        const baseLeft = scrollRect.left - view.scrollDOM.scrollLeft
        const contentRect = view.contentDOM.getBoundingClientRect()
        const left = contentRect.left - baseLeft
        const width = view.contentDOM.clientWidth
        const padding = view.documentPadding
        const lastIndex = meta.groups.length - 1

        return groupRanges(meta, docLength)
            .map((range, index) => ({ ...range, index }))
            .filter(range => !range.group.enabled)
            .map(range => {
                const first = view.lineBlockAt(range.from)
                const last = view.lineBlockAt(Math.max(range.from, range.to - 1))

                /*
                 * 首末組要把 content 的上下 padding 一起吃掉，否則 text area 頂端
                 * 或底部會露出一條沒有紋的暗帶。
                 */
                const padTop = range.index === 0 ? padding.top : 0
                const padBottom = range.index === lastIndex ? padding.bottom : 0
                const top = view.documentTop + first.top - baseTop - padTop
                const height = last.bottom - first.top + padTop + padBottom

                return new HatchMarker(left, top, width, Math.max(height, 0))
            })
    },
})

/* MARK: extension */

export function promptGutters(): Extension {
    return [
        pendingRangeField,
        renamingField,
        dragStateField,
        lineNumberGutter,
        pendingLineMarkers,
        groupNameGutter,
        lineDecorationPlugin,
        disabledHatchLayer,
        dropLineLayer,
    ]
}
