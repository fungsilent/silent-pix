import { comfy } from '@silent-pix/shared'
import { load } from 'exifreader'
import { z } from 'zod'

import { formatJsonText, getJsonIntegerText, isJsonContainerText, parseJsonPreservingIntegers, stringifyJsonPreservingIntegers } from '#/lib/json'

export const metadataFileLimit = 32 * 1024 * 1024
const metadataTextLimit = 2 * 1024 * 1024
const metadataEntryLimit = 512

const uiGraph = z.object({
    nodes: z.array(z.object({ id: z.union([z.number().int(), z.string().min(1)]), type: z.string().min(1) })),
    links: z.array(z.unknown()),
})
const metadataTag = z.object({ value: z.unknown() })
const byteArray = z.array(z.number().int().min(0).max(255))
const encoder = new TextEncoder()

export type MetadataEntry = {
    source: 'png-text' | 'exif'
    key: string
    text: string
    contentOffset: number
    kind: 'prompt' | 'workflow' | 'parameters' | 'other'
    format: 'api-graph' | 'ui-graph' | 'text' | 'invalid-json' | 'unknown-json'
    prompts: MetadataPrompt[]
    /* 只有 api-graph 才有；依節點 ID 排序 */
    nodes: MetadataNode[]
}

export type MetadataPrompt = {
    /* 文字編碼節點 */
    nodeId: string
    title: string | undefined
    field: string
    /* 文字由其他節點連入時，實際放文字的節點 */
    sourceId: string | undefined
    text: string
}

export type MetadataNodeValue =
    | { kind: 'link', nodeId: string, output: number }
    | { kind: 'text' | 'number' | 'json' | 'other', text: string }

export type MetadataNode = {
    id: string
    classType: string
    title: string | undefined
    inputs: { name: string, value: MetadataNodeValue }[]
}

export type ImageMetadata = {
    mime: 'image/png' | 'image/jpeg'
    entries: MetadataEntry[]
    incomplete: boolean
}

export type MetadataOutcome =
    | { status: 'done', result: ImageMetadata }
    | { status: 'error', code: 'FILE_TOO_LARGE' | 'UNSUPPORTED_IMAGE' | 'INVALID_IMAGE' | 'READ_FAILED' }

export async function parseMetadata(file: File): Promise<MetadataOutcome> {
    if (file.size > metadataFileLimit) {
        return { status: 'error', code: 'FILE_TOO_LARGE' }
    }

    let buffer: ArrayBuffer
    try {
        buffer = await file.arrayBuffer()
    } catch {
        return { status: 'error', code: 'READ_FAILED' }
    }

    const mime = sniffMime(new Uint8Array(buffer))
    if (!mime) {
        return { status: 'error', code: 'UNSUPPORTED_IMAGE' }
    }

    try {
        const tags = await load(buffer, {
            expanded: true,
            async: true,
            includeOffsets: true,
            includeTags: { png: true, exif: true, file: ['FileType'] },
            excludeTags: { exif: ['MakerNote', 'ApplicationNotes', 'IPTC-NAA', 'ImageSourceData'] },
            decompress: { maxDecompressedSize: metadataTextLimit },
        })
        const entries: MetadataEntry[] = []
        let incomplete = tags.metadataRange?.complete === false
        let textBytes = 0

        // shortcut: ExifReader silently skips compressed PNG chunks after 255, use a conservative block count until it exposes skipped chunks.
        if ((tags.metadataRange?.blocks.filter(block => block.type === 'png').length ?? 0) >= 255) {
            incomplete = true
        }

        for (const [source, group] of [['png-text', tags.pngText], ['exif', tags.exif]] as const) {
            for (const [key, tag] of Object.entries(group ?? {})) {
                const parsedTag = metadataTag.safeParse(tag)
                if (!parsedTag.success) {
                    incomplete = true
                    continue
                }

                const decoded = readText(key, parsedTag.data.value)
                if (decoded === undefined) continue
                if (decoded === null || decoded === '<text using unknown compression>') {
                    incomplete = true
                    continue
                }

                const size = encoder.encode(key).byteLength + encoder.encode(decoded).byteLength
                if (entries.length >= metadataEntryLimit || textBytes + size > metadataTextLimit) {
                    incomplete = true
                    continue
                }

                textBytes += size
                entries.push(classifyEntry(source, key, decoded))
            }
        }

        return { status: 'done', result: { mime, entries, incomplete } }
    } catch {
        return { status: 'error', code: 'INVALID_IMAGE' }
    }
}

function sniffMime(bytes: Uint8Array): ImageMetadata['mime'] | undefined {
    if (bytes.length >= 8 && [137, 80, 78, 71, 13, 10, 26, 10].every((value, index) => bytes[index] === value)) {
        return 'image/png'
    }
    if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
        return 'image/jpeg'
    }
    return undefined
}

function readText(key: string, value: unknown): string | null | undefined {
    if (typeof value === 'string') return value
    if (Array.isArray(value) && value.every((part: unknown) => typeof part === 'string')) {
        return value.join('\0')
    }
    if (key !== 'UserComment') return undefined

    const parsed = byteArray.safeParse(value)
    if (!parsed.success || parsed.data.length < 8) return null

    const bytes = new Uint8Array(parsed.data)
    const prefix = String.fromCharCode(...bytes.subarray(0, 8))
    const text = bytes.subarray(8)
    let encoding: string
    if (prefix === 'UNICODE\0') {
        encoding = text[0] === 0xff && text[1] === 0xfe ? 'utf-16le' : 'utf-16be'
    } else if (prefix === 'ASCII\0\0\0' || prefix === '\0'.repeat(8)) {
        encoding = 'utf-8'
    } else {
        return null
    }

    try {
        return new TextDecoder(encoding, { fatal: true }).decode(text).replace(/\0+$/, '')
    } catch {
        return null
    }
}

function classifyEntry(source: MetadataEntry['source'], key: string, text: string): MetadataEntry {
    const entry: MetadataEntry = { source, key, text, contentOffset: 0, kind: 'other', format: 'text', prompts: [], nodes: [] }
    let content = text
    let name = source === 'png-text' ? key.toLowerCase() : ''

    if (source === 'exif') {
        const prefixed = /^(prompt|workflow|parameters):/i.exec(text)
        if (prefixed?.[1]) {
            name = prefixed[1].toLowerCase()
            content = text.slice(prefixed[0].length)
            entry.contentOffset = prefixed[0].length
        } else if (key === 'UserComment' && /(?:^|\n)Steps:\s*\d/.test(text)) {
            name = 'parameters'
        }
    }

    if (name === 'parameters') {
        entry.kind = 'parameters'
        return entry
    }
    if (name !== 'prompt' && name !== 'workflow') return entry
    entry.kind = name

    let value: unknown
    try {
        value = parseJsonPreservingIntegers(content)
    } catch {
        entry.format = 'invalid-json'
        return entry
    }

    entry.format = 'unknown-json'
    if (name === 'workflow') {
        if (uiGraph.safeParse(value).success) entry.format = 'ui-graph'
        return entry
    }

    const graph = comfy.parseApiGraph(value)
    if (!graph.ok) return entry
    entry.format = 'api-graph'
    entry.prompts = extractPrompts(graph.graph)
    entry.nodes = Object.entries(graph.graph)
        .sort(([a], [b]) => a.localeCompare(b, 'en', { numeric: true }))
        .map(([id, node]) => ({
            id,
            classType: node.class_type,
            title: node._meta?.title,
            inputs: Object.entries(node.inputs).map(([name, input]) => ({ name, value: nodeValue(input) })),
        }))
    return entry
}

function nodeValue(value: unknown): MetadataNodeValue {
    if (comfy.isGraphLink(value)) return { kind: 'link', nodeId: value[0], output: value[1] }
    const integer = getJsonIntegerText(value)
    if (integer !== undefined) return { kind: 'number', text: integer }
    if (typeof value === 'string') {
        return isJsonContainerText(value) ? { kind: 'json', text: formatJsonText(value.trim()) } : { kind: 'text', text: value }
    }
    if (typeof value === 'number') return { kind: 'number', text: String(value) }
    return { kind: 'other', text: stringifyJsonPreservingIntegers(value) }
}

/* MARK: prompts */
/* 文字編碼節點裡放提示詞的欄位：一般、SDXL、SD3／Flux 的各個 text encoder */
const promptFields = ['text', 'text_g', 'text_l', 'clip_l', 'clip_g', 't5xxl', 'prompt']
/* 文字來源節點（String／Primitive 等）放文字的欄位 */
const sourceFields = ['value', 'text', 'string', 'prompt', 'text_g', 'text_l']

type ApiGraph = Extract<ReturnType<typeof comfy.parseApiGraph>, { ok: true }>['graph']

function extractPrompts(graph: ApiGraph): MetadataPrompt[] {
    const prompts: MetadataPrompt[] = []
    const seen = new Set<string>()

    for (const [nodeId, node] of Object.entries(graph)) {
        if (!node.class_type.includes('TextEncode')) continue

        for (const field of promptFields) {
            const found = resolveText(graph, nodeId, field)
            if (!found) continue

            /* 同一段來源文字（同一個節點的同一欄）只列一次 */
            const key = `${found.nodeId}:${found.field}`
            if (seen.has(key)) continue
            seen.add(key)

            prompts.push({
                nodeId,
                title: node._meta?.title,
                field,
                sourceId: found.nodeId === nodeId ? undefined : found.nodeId,
                text: found.text,
            })
        }
    }

    return prompts
}

/* 順著連線找到真正放文字的節點；最多走 8 層，遇到環就停 */
function resolveText(graph: ApiGraph, nodeId: string, field: string): { nodeId: string, field: string, text: string } | undefined {
    const visited = new Set<string>()
    let current = { nodeId, field }

    for (let depth = 0; depth < 8; depth += 1) {
        const value = graph[current.nodeId]?.inputs[current.field]
        if (typeof value === 'string') {
            return getJsonIntegerText(value) !== undefined ? undefined : { ...current, text: value }
        }
        if (!comfy.isGraphLink(value) || visited.has(value[0])) return undefined
        visited.add(value[0])

        const source = graph[value[0]]
        const next = source && sourceFields.find(name => name in source.inputs)
        if (!next) return undefined
        current = { nodeId: value[0], field: next }
    }

    return undefined
}
