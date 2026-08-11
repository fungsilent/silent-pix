import type { ConfigSchema, JsonObject } from '@silent-pix/db'
import type { TaskApi } from '@silent-pix/shared'

export type ComfyNode = {
    class_type: string
    inputs: Record<string, unknown>
}

export type ComfyPrompt = Record<string, ComfyNode>

export type GenerateConfig = {
    config: TaskApi.TaskConfig
    lora: TaskApi.TaskLora[]
    prompt: {
        positive: TaskApi.TaskPromptTag[]
        negative: TaskApi.TaskPromptTag[]
    }
}

type GeneratorInput = {
    seed: number
    steps: number
    cfg: number
    samplerName: string
    scheduler: string
    width: number
    height: number
    batchSize: number
    positivePrompt: string
    negativePrompt: string
    loraData: string
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
): ComfyPrompt {
    const prompt = structuredClone(graph) as unknown as Record<string, unknown>
    const input = toGeneratorInput(generateConfig)

    for (const [key, mapping] of Object.entries(configSchema)) {
        const node = prompt[mapping.nodeId]

        if (!isComfyNode(node)) {
            throw new ComfyPromptError(`Workflow node "${mapping.nodeId}" does not exist.`)
        }

        if (!(mapping.input in node.inputs)) {
            throw new ComfyPromptError(
                `Workflow input "${mapping.nodeId}.${mapping.input}" does not exist.`,
            )
        }

        const value = input[key as keyof GeneratorInput]

        if (value === undefined) {
            throw new ComfyPromptError(`Generator input "${key}" is not supported.`)
        }

        node.inputs[mapping.input] = value
    }

    return prompt as ComfyPrompt
}

function toGeneratorInput(taskConfig: GenerateConfig): GeneratorInput {
    const seed = Number(resolveSeed(taskConfig.config.seed))

    return {
        seed,
        steps: taskConfig.config.steps,
        cfg: taskConfig.config.cfg,
        samplerName: taskConfig.config.sampler,
        scheduler: 'simple',
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

function serializePrompt(tags: TaskApi.TaskPromptTag[]): string {
    return JSON.stringify({
        version: 1,
        rows: tags.map(tag => ({
            enabled: true,
            label: tag.label,
            text: tag.text,
        })),
        separator: ', ',
    })
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
