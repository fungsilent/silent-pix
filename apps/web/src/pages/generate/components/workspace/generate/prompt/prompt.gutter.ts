import { Decoration, gutter, GutterMarker, layer, ViewPlugin } from '@codemirror/view'

import { toggleGroup } from '#/pages/generate/components/workspace/generate/prompt/prompt.command'
import { groupEnd } from '#/pages/generate/components/workspace/generate/prompt/prompt.document'
import { promptMeta } from '#/pages/generate/components/workspace/generate/prompt/prompt.state'

import type { Extension } from '@codemirror/state'
import type { DecorationSet, EditorView, LayerMarker, ViewUpdate } from '@codemirror/view'
import type { PromptEditorGroup, PromptEditorMeta } from '#/pages/generate/components/workspace/generate/prompt/prompt.document'

/* MARK: shared */

function metaChanged(update: ViewUpdate): boolean {
    return promptMeta(update.startState) !== promptMeta(update.state)
}

function groupRanges(meta: PromptEditorMeta, docLength: number) {
    return meta.groups.map((group, index) => ({
        group,
        from: group.start,
        to: groupEnd(meta, index, docLength),
    }))
}

/* MARK: group name gutter */

class GroupNameMarker extends GutterMarker {
    constructor(private readonly group: PromptEditorGroup) {
        super()
    }

    eq(other: GroupNameMarker): boolean {
        return other.group.id === this.group.id
            && other.group.name === this.group.name
            && other.group.enabled === this.group.enabled
    }

    toDOM(): Node {
        const root = document.createElement('div')
        root.className = 'cm-prompt-group-cell'
        root.dataset.groupId = this.group.id

        const dot = document.createElement('span')
        dot.className = 'cm-prompt-group-dot'
        dot.dataset.enabled = String(this.group.enabled)
        dot.setAttribute('role', 'button')
        dot.setAttribute('aria-pressed', String(this.group.enabled))
        dot.setAttribute('aria-label', `${this.group.enabled ? 'Disable' : 'Enable'} ${this.group.name}`)

        const name = document.createElement('span')
        name.className = 'cm-prompt-group-name'
        name.textContent = this.group.name
        /* 固定欄寬下長名字會被截斷，補一個原生 tooltip */
        name.title = this.group.name

        root.append(dot, name)
        return root
    }
}

/* 空 cell 也要佔位，否則 gutter 會塌掉、文字左緣就會跳動 */
class BlankMarker extends GutterMarker {
    eq(): boolean {
        return true
    }

    toDOM(): Node {
        const root = document.createElement('div')
        root.className = 'cm-prompt-group-cell'
        return root
    }
}

const blankMarker = new BlankMarker()

const groupNameGutter = gutter({
    class: 'cm-prompt-group-gutter',
    renderEmptyElements: true,

    lineMarker(view, line) {
        const meta = promptMeta(view.state)
        const group = meta.groups.find(item => item.start === line.from)
        return group ? new GroupNameMarker(group) : blankMarker
    },

    lineMarkerChange: metaChanged,

    initialSpacer() {
        return blankMarker
    },

    domEventHandlers: {
        /*
         * 用 mousedown 而不是 click：preventDefault 才能保住 editor selection，
         * 這是 plan risk 5 的處置。
         */
        mousedown(view, line, event) {
            const target = event.target
            if (!(target instanceof HTMLElement)) return false
            if (!target.closest('.cm-prompt-group-dot')) return false

            const meta = promptMeta(view.state)
            const group = meta.groups.find(item => item.start === line.from)
            if (!group) return false

            event.preventDefault()
            return toggleGroup(view, group.id)
        },
    },
})

/* MARK: disabled group text */

/*
 * 文字降一階是逐行的 line decoration —— 只有暗紋不准逐行，因為那會讓
 * pattern 每行重新開始。
 */
const disabledLine = Decoration.line({ class: 'cm-prompt-group-off' })

function disabledLineDecorations(view: EditorView): DecorationSet {
    const meta = promptMeta(view.state)
    const ranges = groupRanges(meta, view.state.doc.length).filter(range => !range.group.enabled)
    if (ranges.length === 0) return Decoration.none

    const decorations = []

    for (const visible of view.visibleRanges) {
        for (const range of ranges) {
            const from = Math.max(visible.from, range.from)
            const to = Math.min(visible.to, range.to)
            if (from > to) continue

            let position = view.state.doc.lineAt(from).from
            while (position <= to) {
                const line = view.state.doc.lineAt(position)
                decorations.push(disabledLine.range(line.from))
                if (line.to + 1 > view.state.doc.length) break
                position = line.to + 1
            }
        }
    }

    decorations.sort((a, b) => a.from - b.from)
    return Decoration.set(decorations, true)
}

const disabledLinePlugin = ViewPlugin.fromClass(class {
    decorations: DecorationSet

    constructor(view: EditorView) {
        this.decorations = disabledLineDecorations(view)
    }

    update(update: ViewUpdate) {
        if (update.docChanged || update.viewportChanged || metaChanged(update)) {
            this.decorations = disabledLineDecorations(update.view)
        }
    }
}, {
    decorations: plugin => plugin.decorations,
})

/* MARK: disabled group hatch */

/*
 * 暗紋是一個蓋住整組首末行的單一矩形，不是逐行背景 —— 這樣 45° 條紋才會
 * 跨行連續。矩形左右貼齊 content box，把 CodeMirror 的 content padding 也蓋進去。
 *
 * 每個 disabled group 是各自獨立的 div，background pattern 預設從自己的左上角
 * 起算，所以兩組的條紋相位會對不上。這裡把 background-position 綁到矩形在
 * document 座標系的位置，等於所有矩形共用同一個 pattern 原點。
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

export function promptGroupGutter(): Extension {
    return [
        groupNameGutter,
        disabledLinePlugin,
        disabledHatchLayer,
    ]
}
