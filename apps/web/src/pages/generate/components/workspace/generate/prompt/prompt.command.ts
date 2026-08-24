import { createGroupId, groupEnd, groupIndexAt, isTokenDisabled, tokenAt } from '#/pages/generate/components/workspace/generate/prompt/prompt.document'
import { promptMeta, promptMetaEffect } from '#/pages/generate/components/workspace/generate/prompt/prompt.state'

import type { EditorState, Text } from '@codemirror/state'
import type { EditorView } from '@codemirror/view'
import type { DisabledTokenRange, DisabledTokenValue, PromptEditorGroup, PromptEditorMeta } from '#/pages/generate/components/workspace/generate/prompt/prompt.document'

export const defaultGroupName = 'Group'

/*
 * 所有 group command 都是「只帶 effect、不帶 changes」的 transaction。
 * CodeMirror history 對帶有 inverted effect 的 transaction 仍會建立 event，
 * 所以每個操作都是單一 undo 步驟，而且 Prompt 文字一個字都不會動。
 */
function dispatchMeta(view: EditorView, meta: PromptEditorMeta, userEvent: string): boolean {
    view.dispatch({ effects: promptMetaEffect.of(meta), userEvent })
    return true
}

/*
 * disabled token 的 anchor 是位置，group 邊界變動時位置不動，
 * 但它們歸屬的 group 會換，所以重新標一次 groupId。
 */
function retagDisabledTokens(meta: PromptEditorMeta): PromptEditorMeta {
    return {
        groups: meta.groups,
        disabledTokens: meta.disabledTokens.map(range => ({
            ...range,
            value: {
                ...range.value,
                groupId: meta.groups[groupIndexAt(meta, range.from)]?.id ?? range.value.groupId,
            },
        })),
    }
}

/* MARK: toggle */

export function toggleGroup(view: EditorView, groupId: string): boolean {
    const meta = promptMeta(view.state)
    const index = meta.groups.findIndex(group => group.id === groupId)
    if (index < 0) return false

    return dispatchMeta(view, {
        groups: meta.groups.map((group, groupIndex) => (
            groupIndex === index ? { ...group, enabled: !group.enabled } : group
        )),
        disabledTokens: meta.disabledTokens,
    }, 'prompt.toggleGroup')
}

/* MARK: rename */

export function renameGroup(view: EditorView, groupId: string, value: string): boolean {
    const name = value.trim()
    if (name.length === 0) return false

    const meta = promptMeta(view.state)
    const target = meta.groups.find(group => group.id === groupId)
    if (!target || target.name === name) return false

    return dispatchMeta(view, {
        groups: meta.groups.map(group => (
            group.id === groupId ? { ...group, name } : group
        )),
        disabledTokens: meta.disabledTokens,
    }, 'prompt.renameGroup')
}

/* MARK: create */

export function lineRange(anchorLine: number, headLine: number) {
    return {
        fromLine: Math.min(anchorLine, headLine),
        toLine: Math.max(anchorLine, headLine),
    }
}

/*
 * 依 plan 的 split rule：
 *
 *   Before: A owns lines 1..6，選 3..4
 *   After:  A  id=A     lines 1..2   ← 含原 start，保留原 id
 *           B  id=new   lines 3..4   ← 新建，隨後進入 rename
 *           A' id=new   lines 5..6   ← 延續 A 的 name/enabled，但拿新 id
 */
export function createGroup(view: EditorView, fromLine: number, toLine: number): string | undefined {
    const state: EditorState = view.state
    const meta = promptMeta(state)
    const doc = state.doc

    const from = doc.line(Math.max(1, Math.min(fromLine, doc.lines))).from
    const to = toLine >= doc.lines
        ? doc.length
        : doc.line(Math.min(toLine, doc.lines) + 1).from

    /* 選取範圍剛好等於某一組現有範圍時不必動作 */
    const existingIndex = meta.groups.findIndex(group => group.start === from)
    if (existingIndex >= 0 && groupEnd(meta, existingIndex, doc.length) === to) {
        return undefined
    }

    const before = meta.groups.filter(group => group.start < from)
    const after = meta.groups.filter(group => group.start >= to)
    /* `to` 之後那一段原本歸誰，新的尾段就沿用它的 name/enabled */
    const tail = meta.groups[groupIndexAt(meta, Math.min(to, Math.max(doc.length - 1, 0)))]

    const created: PromptEditorGroup = {
        id: createGroupId(),
        name: defaultGroupName,
        start: from,
        enabled: true,
    }

    const groups = [...before, created]

    const needTail = to < doc.length && !after.some(group => group.start === to)
    if (needTail && tail) {
        groups.push({
            id: createGroupId(),
            name: tail.name,
            start: to,
            enabled: tail.enabled,
        })
    }

    groups.push(...after)

    dispatchMeta(view, retagDisabledTokens({
        groups,
        disabledTokens: meta.disabledTokens,
    }), 'prompt.createGroup')

    return created.id
}

/* MARK: remove boundary */

/*
 * 只移除邊界，Prompt 文字完全不動。
 * 非首組合併到前一組（前一組保留 id/name/enabled）；
 * 首組合併到下一組（下一組保留 id/name/enabled，start 移到 0）。
 */
export function removeGroupBoundary(view: EditorView, groupId: string): boolean {
    const meta = promptMeta(view.state)
    if (meta.groups.length < 2) return false

    const index = meta.groups.findIndex(group => group.id === groupId)
    if (index < 0) return false

    const groups = meta.groups
        .filter((_, groupIndex) => groupIndex !== index)
        .map((group, groupIndex) => (
            index === 0 && groupIndex === 0 ? { ...group, start: 0 } : group
        ))

    return dispatchMeta(view, retagDisabledTokens({
        groups,
        disabledTokens: meta.disabledTokens,
    }), 'prompt.removeGroupBoundary')
}

/* MARK: toggle token */

/*
 * 只改 metadata，document 完全不動 —— 所以 Prompt 文字、selection 與游標
 * 都不受影響，Undo 也只回復這一個狀態。
 */
export function toggleTokenAt(view: EditorView, position: number): boolean {
    const meta = promptMeta(view.state)
    const hit = tokenAt(meta, view.state.doc, position)
    if (!hit) return false

    const { token, group } = hit
    const disabled = isTokenDisabled(meta, token)

    const disabledTokens = disabled
        ? meta.disabledTokens.filter(range => (
            range.from !== token.contentFrom || range.to !== token.contentTo
        ))
        : [
            ...meta.disabledTokens,
            {
                from: token.contentFrom,
                to: token.contentTo,
                value: { id: `token-${crypto.randomUUID()}`, groupId: group.id },
            },
        ].sort((a, b) => a.from - b.from)

    return dispatchMeta(view, { groups: meta.groups, disabledTokens }, 'prompt.toggleToken')
}

/* Alt-click 在部分 Linux window manager 會被系統攔截，這是等價的鍵盤入口 */
export function toggleTokenAtCursor(view: EditorView): boolean {
    const selection = view.state.selection.main
    if (!selection.empty) return false
    return toggleTokenAt(view, selection.head)
}

/* MARK: move group */

type GroupBlock = {
    group: PromptEditorGroup
    /* 該組的文字，不含結尾換行 —— 首末組的換行歸屬不同，統一在這裡剝掉 */
    body: string
    /* 每個 disabled token 相對於該組起點的位移 */
    tokens: { fromOffset: number, toOffset: number, value: DisabledTokenValue }[]
}

function groupBlocks(meta: PromptEditorMeta, doc: Text): GroupBlock[] {
    return meta.groups.map((group, index) => {
        const from = group.start
        const to = groupEnd(meta, index, doc.length)
        const slice = doc.sliceString(from, to)

        return {
            group,
            body: slice.endsWith('\n') ? slice.slice(0, -1) : slice,
            tokens: meta.disabledTokens
                .filter(range => range.from >= from && range.to <= to)
                .map(range => ({
                    fromOffset: range.from - from,
                    toOffset: range.to - from,
                    value: range.value,
                })),
        }
    })
}

/*
 * 把整個 group 的完整行 block 搬到 targetIndex 之前（等於 groups.length 表示搬到最後）。
 *
 * 換行的歸屬是這裡唯一的陷阱：非末組的 block 自帶結尾換行，末組沒有，
 * 所以刪除末組時要連前面那個換行一起吃掉，插入到文件末端時則要先補一個換行。
 * body 一律不含換行，兩端各自補齊，first/middle/last/single 就走同一條路。
 */
export type GroupMoveSpec = {
    changes: { from: number, to?: number, insert?: string }[]
    meta: PromptEditorMeta
    selection: number
}

export function groupMoveSpec(state: EditorState, groupId: string, targetIndex: number): GroupMoveSpec | undefined {
    const meta = promptMeta(state)
    const doc = state.doc
    if (meta.groups.length < 2) return undefined

    const index = meta.groups.findIndex(group => group.id === groupId)
    if (index < 0) return undefined
    /* 放回原位：不動 document，也不產生 history event */
    if (targetIndex === index || targetIndex === index + 1) return undefined

    const blocks = groupBlocks(meta, doc)
    const moving = blocks[index]
    if (!moving) return undefined

    const from = moving.group.start
    const to = groupEnd(meta, index, doc.length)
    const isLast = index === meta.groups.length - 1

    const deleteFrom = isLast ? Math.max(from - 1, 0) : from
    const deleteTo = to

    const appending = targetIndex >= meta.groups.length
    const at = appending ? doc.length : (meta.groups[targetIndex]?.start ?? doc.length)
    const insert = appending ? `\n${moving.body}` : `${moving.body}\n`

    /* CodeMirror 要求 change 依位置排序且不重疊 */
    const changes = at <= deleteFrom
        ? [{ from: at, insert }, { from: deleteFrom, to: deleteTo }]
        : [{ from: deleteFrom, to: deleteTo }, { from: at, insert }]

    /*
     * metadata 自己算，不交給 transactionExtender —— 它只會把舊 start 映射過去，
     * 搬動後的順序它推不出來。
     */
    const ordered = blocks.filter((_, blockIndex) => blockIndex !== index)
    ordered.splice(targetIndex > index ? targetIndex - 1 : targetIndex, 0, moving)

    const groups: PromptEditorGroup[] = []
    const disabledTokens: DisabledTokenRange[] = []
    let cursor = 0
    let movedStart = 0

    ordered.forEach(block => {
        groups.push({ ...block.group, start: cursor })
        if (block === moving) movedStart = cursor

        block.tokens.forEach(token => {
            disabledTokens.push({
                from: cursor + token.fromOffset,
                to: cursor + token.toOffset,
                value: token.value,
            })
        })

        cursor += block.body.length + 1
    })

    disabledTokens.sort((a, b) => a.from - b.from)

    return {
        changes,
        meta: { groups, disabledTokens },
        selection: movedStart,
    }
}

export function moveGroup(view: EditorView, groupId: string, targetIndex: number): boolean {
    const spec = groupMoveSpec(view.state, groupId, targetIndex)
    if (!spec) return false

    view.dispatch({
        changes: spec.changes,
        effects: promptMetaEffect.of(spec.meta),
        selection: { anchor: spec.selection },
        userEvent: 'prompt.moveGroup',
        scrollIntoView: true,
    })

    return true
}
