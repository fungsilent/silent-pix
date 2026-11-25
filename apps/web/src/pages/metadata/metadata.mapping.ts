import { t } from '#/lib/i18n'
import { cloneGenerateValues, draftGenerateValues, referenceSize } from '#/pages/generate/form'

import type { TaskApi } from '@silent-pix/shared'
import type { GenerateValues, ReferenceImage } from '#/pages/generate/form'
import type { DraftDefaultField } from '#/pages/generate/session'
import type { MetadataEntry, MetadataNode, MetadataNodeValue } from '#/pages/metadata/metadata.parse'

/*
 * 從 ComfyUI API graph 取出 Generate 草稿的值。
 * 只認常見形狀：帶 seed／steps／cfg／sampler_name 的 sampler、它連到的 latent 與 prompt、LoRA loader。
 */

type PromptDocument = TaskApi.TaskPromptDocument

export type GraphCopy = {
    seed?: string | undefined
    steps?: number | undefined
    cfg?: number | undefined
    sampler?: string | undefined
    denoise?: number | undefined
    width?: number | undefined
    height?: number | undefined
    batch?: number | undefined
    positive?: PromptDocument | undefined
    negative?: PromptDocument | undefined
    lora?: { name: string, weight: number }[]
}

/* 文字編碼節點放提示詞的欄位，加上 Silent Pix 自己的 PromptStack */
const promptFields = ['PromptStackState', 'text', 'text_g', 'text_l', 'clip_l', 'clip_g', 't5xxl', 'prompt']
const sourceFields = ['PromptStackState', 'value', 'text', 'string', 'prompt', 'text_g', 'text_l']

export function copyFromGraph(entry: MetadataEntry): GraphCopy {
    const nodes = new Map(entry.nodes.map(node => [node.id, node]))
    const input = (node: MetadataNode | undefined, name: string) => node?.inputs.find(item => item.name === name)?.value
    const has = (node: MetadataNode, names: string[]) => names.every(name => input(node, name) !== undefined)
    const linked = (value: MetadataNodeValue | undefined) => value?.kind === 'link' ? nodes.get(value.nodeId) : undefined
    const result: GraphCopy = {}

    const number = (node: MetadataNode | undefined, name: string) => {
        const value = input(node, name)
        return value?.kind === 'number' && Number.isFinite(Number(value.text)) ? value.text : undefined
    }

    // MARK: sampler
    const samplers = entry.nodes.filter(node => has(node, ['steps', 'cfg', 'sampler_name']) && (input(node, 'seed') ?? input(node, 'noise_seed')))
    /* 起點是 latent 上游沒有其他 sampler 的那個；多段重繪（txt2img 後接 img2img、base＋refiner）都會選到第一段 */
    const afterSampler = (node: MetadataNode) => {
        const queue = [linked(input(node, 'latent_image'))]
        const seen = new Set<string>()
        while (queue.length > 0 && seen.size < 64) {
            const current = queue.shift()
            if (!current || seen.has(current.id)) continue
            if (samplers.includes(current)) return true
            seen.add(current.id)
            queue.push(...current.inputs.map(item => linked(item.value)))
        }
        return false
    }
    const sampler = samplers.find(node => !afterSampler(node)) ?? samplers[0]
    if (sampler) {
        result.seed = number(sampler, input(sampler, 'seed') ? 'seed' : 'noise_seed')
        const steps = number(sampler, 'steps')
        if (steps) result.steps = Number(steps)
        const cfg = number(sampler, 'cfg')
        if (cfg) result.cfg = Number(cfg)
        const denoise = number(sampler, 'denoise')
        if (denoise) result.denoise = Number(denoise)
        const name = input(sampler, 'sampler_name')
        if (name?.kind === 'text') result.sampler = name.text
    }

    // MARK: latent
    const latentFrom = linked(input(sampler, 'latent_image'))
    const latent = latentFrom && has(latentFrom, ['width', 'height'])
        ? latentFrom
        : entry.nodes.find(node => node.classType.includes('EmptyLatent') && has(node, ['width', 'height']))
    if (latent) {
        const width = number(latent, 'width')
        const height = number(latent, 'height')
        const batch = number(latent, 'batch_size')
        if (width) result.width = Number(width)
        if (height) result.height = Number(height)
        if (batch) result.batch = Number(batch)
    }

    // MARK: prompts
    const findPrompt = (start: MetadataNode | undefined) => {
        /* 從 sampler 的 positive／negative 往上游找，第一個帶提示詞欄位的節點就是它；最多 16 個節點 */
        const queue = start ? [start] : []
        const seen = new Set<string>()
        while (queue.length > 0 && seen.size < 16) {
            const node = queue.shift()!
            if (seen.has(node.id)) continue
            seen.add(node.id)

            for (const name of promptFields) {
                const found = resolveText(nodes, node, name)
                if (found) return toPromptDocument(found.text, found.input === 'PromptStackState')
            }
            for (const item of node.inputs) {
                const next = linked(item.value)
                if (next) queue.push(next)
            }
        }
        return undefined
    }
    result.positive = findPrompt(linked(input(sampler, 'positive')))
    result.negative = findPrompt(linked(input(sampler, 'negative')))

    // MARK: LoRA
    const multiLora = entry.nodes.find(node => input(node, 'lora_data') !== undefined)
    if (multiLora) {
        result.lora = parseLoraData(input(multiLora, 'lora_data'))
    }
    else {
        const loaders = entry.nodes.filter(node => input(node, 'lora_name')?.kind === 'text')
        if (loaders.length > 0) {
            result.lora = loaders.map(node => ({
                name: (input(node, 'lora_name') as { text: string }).text,
                weight: Number((input(node, 'strength_model') as { text?: string } | undefined)?.text ?? 1),
            }))
        }
    }

    return result
}

/* 順著連線找到真正放文字的節點；最多走 8 層 */
function resolveText(nodes: Map<string, MetadataNode>, start: MetadataNode, field: string) {
    let node = start
    let name = field
    for (let depth = 0; depth < 8; depth += 1) {
        const value = node.inputs.find(item => item.name === name)?.value
        if (value?.kind === 'text' || value?.kind === 'json') return { node, input: name, text: value.text }
        if (value?.kind !== 'link') return undefined
        const source = nodes.get(value.nodeId)
        const next = source && sourceFields.find(candidate => source.inputs.some(item => item.name === candidate))
        if (!source || !next) return undefined
        node = source
        name = next
    }
    return undefined
}

/* PromptStack 的每一列成為一個群組；一般文字整段一個群組 */
function toPromptDocument(text: string, stack: boolean): PromptDocument {
    const rows = stack ? parseStackRows(text) : undefined
    if (!rows || rows.length === 0) {
        return { text, groups: [{ id: 'metadata-0', name: 'Default', fromLine: 1, toLine: text.split('\n').length, enabled: true, disabledTokenIndexes: [] }] }
    }

    let line = 1
    const groups = rows.map((row, index) => {
        const count = row.text.split('\n').length
        const group = { id: `metadata-${index}`, name: row.label || 'Default', fromLine: line, toLine: line + count - 1, enabled: row.enabled, disabledTokenIndexes: [] }
        line += count
        return group
    })
    return { text: rows.map(row => row.text).join('\n'), groups }
}

function parseStackRows(text: string): { enabled: boolean, label: string, text: string }[] | undefined {
    try {
        const value: unknown = JSON.parse(text)
        const rows = (value as { rows?: unknown })?.rows
        if (!Array.isArray(rows)) return undefined
        return rows.flatMap(row => {
            const { enabled, label, text: rowText } = (row ?? {}) as Record<string, unknown>
            return typeof rowText === 'string'
                ? [{ enabled: enabled !== false, label: typeof label === 'string' ? label.trim() : '', text: rowText }]
                : []
        })
    }
    catch {
        return undefined
    }
}

function parseLoraData(value: MetadataNodeValue | undefined): { name: string, weight: number }[] {
    if (value?.kind !== 'json' && value?.kind !== 'text') return []
    try {
        const rows: unknown = JSON.parse(value.text)
        if (!Array.isArray(rows)) return []
        return rows.flatMap(row => {
            const { on, lora, str } = (row ?? {}) as Record<string, unknown>
            return on !== false && typeof lora === 'string' && lora
                ? [{ name: lora, weight: typeof str === 'number' ? str : 1 }]
                : []
        })
    }
    catch {
        return []
    }
}

/* MARK: Generate draft */
/* 找到的欄位蓋過草稿預設值；找不到的列出來，連同目前採用的預設值 */
export function toGenerateDraft(copy: GraphCopy, referenceImage?: ReferenceImage): { values: GenerateValues, defaults: { field: DraftDefaultField, value: string }[] } {
    const values = cloneGenerateValues(draftGenerateValues)
    const size = referenceImage && referenceSize(referenceImage)
    values.referenceImage = referenceImage ?? null
    const defaults: { field: DraftDefaultField, value: string }[] = []
    const take = <K extends DraftDefaultField & keyof GenerateValues>(field: K, found: GenerateValues[K] | undefined, shown: () => string) => {
        if (found === undefined) defaults.push({ field, value: shown() })
        else values[field] = found
    }
    const firstLine = (document: PromptDocument) => document.text.split('\n').find(line => line.trim())?.trim() ?? ''

    take('seed', copy.seed, () => t('common.random'))
    take('steps', copy.steps, () => String(values.steps))
    take('cfg', copy.cfg, () => String(values.cfg))
    take('sampler', copy.sampler, () => values.sampler)
    take('denoise', referenceImage && copy.denoise === 1 ? undefined : copy.denoise, () => String(values.denoise))
    take('width', size?.width ?? copy.width, () => String(values.width))
    take('height', size?.height ?? copy.height, () => String(values.height))
    take('batch', copy.batch, () => String(values.batch))
    take('positive', copy.positive, () => firstLine(values.positive))
    take('negative', copy.negative, () => firstLine(values.negative))
    if (copy.lora) {
        values.lora = copy.lora.map(lora => ({ id: `lora-${crypto.randomUUID()}`, name: lora.name, weight: Math.min(Math.max(lora.weight, 0), 2) }))
    }
    return { values, defaults }
}
