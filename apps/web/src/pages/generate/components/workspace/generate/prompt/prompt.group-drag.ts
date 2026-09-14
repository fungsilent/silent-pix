import { StateEffect, StateField } from '@codemirror/state'
import { layer } from '@codemirror/view'

import { moveGroup } from '#/pages/generate/components/workspace/generate/prompt/prompt.command'
import { promptMeta } from '#/pages/generate/components/workspace/generate/prompt/prompt.state'

import type { Extension } from '@codemirror/state'
import type { EditorView, LayerMarker, ViewUpdate } from '@codemirror/view'

/* MARK: transient UI state */

type DragState = { groupId: string, targetIndex: number } | null

const dragThreshold = 4
const setDragState = StateEffect.define<DragState>()

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

function dragStateChanged(update: ViewUpdate): boolean {
    return update.startState.field(dragStateField) !== update.state.field(dragStateField)
}

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

export function startGroupDrag(view: EditorView, groupId: string, startX: number, startY: number): void {
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
        return update.docChanged || update.viewportChanged || update.geometryChanged || dragStateChanged(update)
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

/* MARK: extension */

export function groupDragExtensions(): Extension {
    return [dragStateField, dropLineLayer]
}
