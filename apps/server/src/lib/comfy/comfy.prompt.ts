import type { ConfigSchema, JsonObject } from '@silent-pix/db'
import type { TaskApi } from '@silent-pix/shared'

export type ComfyNode = {
    class_type: string
    inputs: Record<string, unknown>
}

export type ComfyPrompt = Record<string, ComfyNode>

/* 就是 tasks.config 欄位的內容，形狀由 contract 定義，這裡不另外寫一份 */
export type GenerateConfig = TaskApi.TaskGenerateConfig

/* 只存在於這一次執行，絕不寫進 tasks.config，也絕不進 log */
export type GenerateRuntime = {
    /* ComfyUI 看得到的絕對路徑；空字串代表 txt2img */
    initImagePath: string
}

type GeneratorInput = {
    seed: number
    steps: number
    cfg: number
    samplerName: string
    width: number
    height: number
    batchSize: number
    positivePrompt: string
    negativePrompt: string
    loraData: string
    denoise: number
    initImagePath: string
}

/*
 * 模式由 graph 自己判定：路徑是空字串時 StringCompare 為真，switch 走 EmptyLatentImage；
 * 有路徑就走 VAEEncode。server 只負責填那個字串，不需要另一個模式旗標。
 */
export const txt2imgRuntime: GenerateRuntime = {
    initImagePath: '',
}

export class ComfyPromptError extends Error {
    readonly code = 'COMFY_PROMPT_BUILD_ERROR'

    constructor(message: string) {
        super(message)
        this.name = 'ComfyPromptError'
    }
}

export function buildComfyPrompt(
    graph: JsonObject,
    configSchema: ConfigSchema,
    generateConfig: GenerateConfig,
    runtime: GenerateRuntime,
): ComfyPrompt {
    const prompt = structuredClone(graph) as unknown as Record<string, unknown>
    const input = toGeneratorInput(generateConfig, runtime)

    for (const [key, mapping] of Object.entries(configSchema)) {
        if (!(key in input)) {
            continue
        }

        const node = prompt[mapping.nodeId]

        if (!isComfyNode(node)) {
            throw new ComfyPromptError(`Workflow node "${mapping.nodeId}" does not exist.`)
        }

        if (!(mapping.input in node.inputs)) {
            throw new ComfyPromptError(
                `Workflow input "${mapping.nodeId}.${mapping.input}" does not exist.`,
            )
        }

        node.inputs[mapping.input] = input[key as keyof GeneratorInput]
    }

    return prompt as ComfyPrompt
}

function toGeneratorInput(taskConfig: GenerateConfig, runtime: GenerateRuntime): GeneratorInput {
    const seed = Number(resolveSeed(taskConfig.config.seed))

    return {
        seed,
        steps: taskConfig.config.steps,
        cfg: taskConfig.config.cfg,
        samplerName: taskConfig.config.sampler,
        width: taskConfig.config.width,
        height: taskConfig.config.height,
        batchSize: taskConfig.config.batch,
        positivePrompt: serializePrompt(taskConfig.prompt.positive),
        negativePrompt: serializePrompt(taskConfig.prompt.negative),
        loraData: JSON.stringify(taskConfig.lora.map(lora => ({
            on: true,
            lora: lora.name,
            str: lora.weight,
            vid: 1,
            v2a: 1,
            aud: 1,
            a2v: 1,
            other: 1,
        }))),
        denoise: taskConfig.config.denoise,
        initImagePath: runtime.initImagePath,
    }
}

export function resolveSeed(value: string | null): string {
    const seed = !value ? createRandomSeed() : Number(value)

    if (!Number.isSafeInteger(seed) || seed < 0) {
        throw new ComfyPromptError('Task seed must be a non-negative safe integer.')
    }

    return String(seed)
}

function createRandomSeed(): number {
    const bytes = crypto.getRandomValues(new Uint8Array(8))
    const view = new DataView(bytes.buffer)
    const maxHighBits = Math.floor(Number.MAX_SAFE_INTEGER / 2 ** 32)
    const high = view.getUint32(0) & maxHighBits

    return high * 2 ** 32 + view.getUint32(4)
}

/*
 * 每個 group 都輸出一個 row，關掉的組靠 enabled: false 表達，不是把它抽掉 ——
 * 這樣 Prompt Stack 的列數與畫面上的 group 一一對應。
 * Task 的 text 永遠原樣保存，只有 row text 會排除 disabled token。
 */
export function serializePrompt(document: TaskApi.TaskPromptDocument): string {
    const lines = document.text.split('\n')

    return JSON.stringify({
        version: 1,
        rows: document.groups.map(group => ({
            enabled: group.enabled,
            label: group.name,
            text: serializeGroupText(
                lines.slice(group.fromLine - 1, group.toLine).join('\n'),
                group.disabledTokenIndexes,
            ),
        })),
        separator: ', ',
    })
}

/*
 * 逗號切段後逐段重組：只有「trim 後非空」的段落才佔一個 index，
 * 被停用的那幾段連同它的逗號一起消失，其餘一字不改。
 */
function serializeGroupText(text: string, disabledTokenIndexes: number[]): string {
    if (disabledTokenIndexes.length === 0) return text

    const disabled = new Set(disabledTokenIndexes)
    const segments = text.split(',')
    const kept: string[] = []
    let tokenIndex = 0

    segments.forEach(segment => {
        const isToken = segment.trim().length > 0
        const skip = isToken && disabled.has(tokenIndex)
        if (isToken) tokenIndex += 1

        if (skip) return
        kept.push(segment)
    })

    return kept.join(',')
}

function isComfyNode(value: unknown): value is ComfyNode {
    if (!value || typeof value !== 'object') {
        return false
    }

    const node = value as Record<string, unknown>

    return typeof node.class_type === 'string'
        && !!node.inputs
        && typeof node.inputs === 'object'
        && !Array.isArray(node.inputs)
}
