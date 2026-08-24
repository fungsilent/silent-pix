import { invertedEffects } from '@codemirror/commands'
import { EditorState, StateEffect, StateField } from '@codemirror/state'

import { groupEnd, parseTokens, promptDocumentToMeta } from '#/pages/generate/components/workspace/generate/prompt/prompt.document'

import type { ChangeDesc, EditorState as EditorStateType, Extension, Text } from '@codemirror/state'
import type { PromptDocument, PromptEditorGroup, PromptEditorMeta } from '#/pages/generate/components/workspace/generate/prompt/prompt.document'

/* MARK: effect */

export const promptMetaEffect = StateEffect.define<PromptEditorMeta>()

/* MARK: field */

export const promptStateField = StateField.define<PromptEditorMeta>({
    create() {
        return { groups: [], disabledTokens: [] }
    },

    update(value, transaction) {
        for (const effect of transaction.effects) {
            if (effect.is(promptMetaEffect)) {
                return effect.value
            }
        }

        return value
    },
})

export function promptMeta(state: EditorStateType): PromptEditorMeta {
    return state.field(promptStateField)
}

export function initialPromptMeta(document: PromptDocument, text: Text): PromptEditorMeta {
    return promptDocumentToMeta(document, text)
}

/* MARK: reconciliation */

/*
 * 文字變動後把 group start 與 disabled token anchor 映射到新位置。
 * 沒有 command 明確覆寫 snapshot 時，這是唯一維護 metadata 的地方。
 */
export function reconcilePromptMeta(
    meta: PromptEditorMeta,
    changes: ChangeDesc,
    text: Text,
): PromptEditorMeta {
    const seen = new Set<number>()
    const groups: PromptEditorGroup[] = []

    meta.groups.forEach((group, index) => {
        /* 第一組永遠釘在文件開頭，否則在行首插入會把整份文件推出所有 group */
        const mapped = index === 0
            ? 0
            : normalizeToLineStart(changes.mapPos(group.start, -1), text)

        if (seen.has(mapped)) return

        seen.add(mapped)
        groups.push({ ...group, start: mapped })
    })

    if (groups.length === 0) {
        const first = meta.groups[0]
        groups.push(first
            ? { ...first, start: 0 }
            : { id: 'group-fallback', name: 'Prompt', start: 0, enabled: true })
    }

    groups.sort((a, b) => a.start - b.start)

    const next: PromptEditorMeta = { groups, disabledTokens: [] }

    /*
     * anchor 先映射，再用所屬 group 的重新 parse 結果對位：只有真的還蓋在某個
     * 非空 token 上的 anchor 才留下來。split 取重疊最大者、平手取左，
     * merge 後任一來源 disabled 即 disabled，內容被刪光的就此消失。
     */
    meta.disabledTokens.forEach(range => {
        const from = changes.mapPos(range.from, -1)
        const to = changes.mapPos(range.to, 1)
        if (from >= to) return

        const groupIndex = groups.findIndex((group, index) => (
            group.start <= from && from < groupEnd(next, index, text.length)
        ))
        if (groupIndex < 0) return

        const group = groups[groupIndex]
        if (!group) return

        const groupFrom = group.start
        const groupTo = groupEnd(next, groupIndex, text.length)
        const tokens = parseTokens(text.sliceString(groupFrom, groupTo), groupFrom)

        const matched = tokens
            .map(token => ({
                token,
                overlap: Math.min(to, token.contentTo) - Math.max(from, token.contentFrom),
            }))
            .filter(entry => entry.overlap > 0)
            .sort((a, b) => b.overlap - a.overlap || a.token.contentFrom - b.token.contentFrom)[0]
            ?.token

        if (!matched) return

        const duplicate = next.disabledTokens.some(existing => (
            existing.from === matched.contentFrom && existing.to === matched.contentTo
        ))
        if (duplicate) return

        next.disabledTokens.push({
            from: matched.contentFrom,
            to: matched.contentTo,
            value: { ...range.value, groupId: group.id },
        })
    })

    next.disabledTokens.sort((a, b) => a.from - b.from)

    return next
}

function normalizeToLineStart(position: number, text: Text): number {
    return text.lineAt(Math.min(Math.max(position, 0), text.length)).from
}

/* MARK: extensions */

/*
 * 文字改變且該 transaction 沒有自帶 snapshot 時才補一份 ——
 * command 自行 dispatch 的 snapshot 優先，不會被覆蓋。
 */
const promptReconciler = EditorState.transactionExtender.of(transaction => {
    if (!transaction.docChanged) return null
    if (transaction.effects.some(effect => effect.is(promptMetaEffect))) return null

    const before = transaction.startState.field(promptStateField)
    const after = reconcilePromptMeta(before, transaction.changes, transaction.newDoc)

    return { effects: promptMetaEffect.of(after) }
})

const promptHistory = invertedEffects.of(transaction => {
    if (!transaction.effects.some(effect => effect.is(promptMetaEffect))) return []
    return [promptMetaEffect.of(transaction.startState.field(promptStateField))]
})

export function promptStateExtensions(initial: PromptEditorMeta): Extension {
    return [
        promptStateField.init(() => initial),
        promptReconciler,
        promptHistory,
    ]
}
