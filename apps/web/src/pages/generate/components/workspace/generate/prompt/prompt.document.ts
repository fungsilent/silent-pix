import type { Text } from '@codemirror/state'

/* MARK: persistent shape */

/*
 * PHASE 1–6 的 page-scoped 形狀。PHASE 7 shared contract 落地後直接換成
 * TaskApi.TaskPromptDocument，欄位刻意保持一致，避免屆時還要改 call site。
 */
export type PromptGroup = {
    id: string
    name: string
    fromLine: number
    toLine: number
    enabled: boolean
    disabledTokenIndexes: number[]
}

export type PromptDocument = {
    text: string
    groups: PromptGroup[]
}

/* MARK: transient shape */

/*
 * 只存 start，end 由下一組的 start 或 doc.length 推導 —— 這樣經過任何
 * ChangeSet 之後都不可能出現 gap 或 overlap，不需要額外的修補步驟。
 */
export type PromptEditorGroup = {
    id: string
    name: string
    start: number
    enabled: boolean
}

export type DisabledTokenValue = {
    id: string
    groupId: string
}

export type DisabledTokenRange = {
    from: number
    to: number
    value: DisabledTokenValue
}

export type PromptEditorMeta = {
    groups: PromptEditorGroup[]
    disabledTokens: DisabledTokenRange[]
}

/* MARK: token parser */

export type ParsedToken = {
    index: number
    rawFrom: number
    rawTo: number
    contentFrom: number
    contentTo: number
}

/*
 * 逗號是唯一 delimiter，換行不是。空白 segment 與尾逗號不建立 token identity，
 * 所以 index 只計算 trim 後非空的 segment。
 */
export function parseTokens(text: string, offset = 0): ParsedToken[] {
    const tokens: ParsedToken[] = []
    let segmentStart = 0

    for (let cursor = 0; cursor <= text.length; cursor += 1) {
        if (cursor < text.length && text[cursor] !== ',') continue

        const segment = text.slice(segmentStart, cursor)
        const contentFrom = segmentStart + (segment.length - segment.trimStart().length)
        const contentTo = cursor - (segment.length - segment.trimEnd().length)

        if (contentFrom < contentTo) {
            tokens.push({
                index: tokens.length,
                rawFrom: offset + segmentStart,
                rawTo: offset + cursor,
                contentFrom: offset + contentFrom,
                contentTo: offset + contentTo,
            })
        }

        segmentStart = cursor + 1
    }

    return tokens
}

/* MARK: group geometry */

export function groupEnd(meta: PromptEditorMeta, index: number, docLength: number): number {
    return meta.groups[index + 1]?.start ?? docLength
}

export function groupIndexAt(meta: PromptEditorMeta, position: number): number {
    let found = 0

    for (let index = 0; index < meta.groups.length; index += 1) {
        const group = meta.groups[index]
        if (group && group.start <= position) {
            found = index
            continue
        }
        break
    }

    return found
}

/* MARK: persistent ↔ transient */

export function createGroupId(): string {
    return `group-${crypto.randomUUID()}`
}

export function emptyPromptDocument(name = 'Prompt'): PromptDocument {
    return {
        text: '',
        groups: [{
            id: createGroupId(),
            name,
            fromLine: 1,
            toLine: 1,
            enabled: true,
            disabledTokenIndexes: [],
        }],
    }
}

export function clonePromptDocument(document: PromptDocument): PromptDocument {
    return {
        text: document.text,
        groups: document.groups.map(group => ({
            ...group,
            disabledTokenIndexes: [...group.disabledTokenIndexes],
        })),
    }
}

/*
 * fromLine/toLine → document position。行號來自 persistent 形狀，這裡不做修補，
 * 越界的值直接夾到合法範圍，讓 editor 永遠可以開起來。
 */
export function promptDocumentToMeta(document: PromptDocument, text: Text): PromptEditorMeta {
    const groups: PromptEditorGroup[] = []
    const disabledTokens: DisabledTokenRange[] = []

    document.groups.forEach((group, index) => {
        const line = text.line(clampLine(index === 0 ? 1 : group.fromLine, text.lines))
        groups.push({
            id: group.id,
            name: group.name,
            start: index === 0 ? 0 : line.from,
            enabled: group.enabled,
        })
    })

    if (groups.length === 0) {
        groups.push({
            id: createGroupId(),
            name: 'Prompt',
            start: 0,
            enabled: true,
        })
    }

    const meta: PromptEditorMeta = { groups, disabledTokens }

    document.groups.forEach((group, index) => {
        const editorGroup = meta.groups[index]
        if (!editorGroup) return

        const from = editorGroup.start
        const to = groupEnd(meta, index, text.length)
        const tokens = parseTokens(text.sliceString(from, to), from)

        group.disabledTokenIndexes.forEach(tokenIndex => {
            const token = tokens[tokenIndex]
            if (!token) return

            disabledTokens.push({
                from: token.contentFrom,
                to: token.contentTo,
                value: { id: `token-${crypto.randomUUID()}`, groupId: editorGroup.id },
            })
        })
    })

    disabledTokens.sort((a, b) => a.from - b.from)

    return meta
}

/*
 * transient → persistent。行號與 token index 都在這裡才投影一次，
 * transaction 期間只維護 position，避免每次輸入都全量重算。
 */
export function serializePromptDocument(meta: PromptEditorMeta, text: Text): PromptDocument {
    const groups: PromptGroup[] = meta.groups.map((group, index) => {
        const from = group.start
        const to = groupEnd(meta, index, text.length)
        const fromLine = text.lineAt(from).number
        const toLine = index === meta.groups.length - 1
            ? text.lines
            : text.lineAt(Math.max(from, to - 1)).number

        const tokens = parseTokens(text.sliceString(from, to), from)
        const disabledTokenIndexes = tokens
            .filter(token => meta.disabledTokens.some(range => (
                range.from === token.contentFrom && range.to === token.contentTo
            )))
            .map(token => token.index)

        return {
            id: group.id,
            name: group.name,
            fromLine,
            toLine: Math.max(fromLine, toLine),
            enabled: group.enabled,
            disabledTokenIndexes,
        }
    })

    return { text: text.toString(), groups }
}

function clampLine(line: number, lines: number): number {
    if (!Number.isFinite(line)) return 1
    return Math.min(Math.max(Math.trunc(line), 1), lines)
}
