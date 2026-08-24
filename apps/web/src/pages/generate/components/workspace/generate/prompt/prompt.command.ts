import { createGroupId, groupEnd, groupIndexAt, isTokenDisabled, tokenAt } from '#/pages/generate/components/workspace/generate/prompt/prompt.document'
import { promptMeta, promptMetaEffect } from '#/pages/generate/components/workspace/generate/prompt/prompt.state'

import type { EditorState } from '@codemirror/state'
import type { EditorView } from '@codemirror/view'
import type { PromptEditorGroup, PromptEditorMeta } from '#/pages/generate/components/workspace/generate/prompt/prompt.document'

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
