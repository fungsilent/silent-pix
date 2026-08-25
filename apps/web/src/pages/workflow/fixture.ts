import type { WorkflowRecord } from '#/pages/workflow/store'

/*
 * PHASE 3 是 client-only：清單與內容都是 fixture，Save / Delete 都停用。
 * 接上 REST 之後這個檔案整個刪掉。
 */

const animaGraph = {
    '46:6': {
        class_type: 'KSampler',
        _meta: { title: 'KSampler' },
        inputs: {
            seed: 140787961435998,
            steps: 30,
            cfg: 4,
            sampler_name: 'euler',
            scheduler: 'beta57',
            denoise: 0.8,
            model: ['47', 0],
            positive: ['46:85', 0],
            negative: ['46:86', 0],
            latent_image: ['122', 0],
        },
    },
    '47': {
        class_type: 'MultiLoRALoader',
        _meta: { title: 'Multi LoRA Loader' },
        inputs: {
            lora_data: '[{"on":true,"lora":"anima_krea2-masterpieces-v51.safetensors","str":0.5}]',
            ltx_mode: false,
            model: ['45:14', 0],
            clip: ['45:16', 0],
        },
    },
    '48': {
        class_type: 'PixaromaPromptStack',
        _meta: { title: 'Prompt Stack Pixaroma' },
        inputs: {
            PromptStackState: '{"version":1,"rows":[{"enabled":true,"label":"Default","text":"worst quality"}]}',
        },
    },
    '100': {
        class_type: 'PixaromaPromptStack',
        _meta: { title: 'Prompt Stack Pixaroma' },
        inputs: {
            PromptStackState: '{"version":1,"rows":[{"enabled":true,"label":"畫質","text":"masterpiece"}]}',
        },
    },
    '75': {
        class_type: 'PixaromaLoadImage',
        _meta: { title: 'Load Image Pixaroma' },
        inputs: {
            image: 'from-PixAI-2047963696822640293.png',
        },
    },
    '123:78': {
        class_type: 'EmptyLatentImage',
        _meta: { title: 'Size' },
        inputs: {
            width: 920,
            height: 1536,
            batch_size: 1,
        },
    },
}

export const workflowFixtures: WorkflowRecord[] = [
    {
        id: 'fixture-anima',
        name: 'Anima',
        archivedAt: null,
        graphText: JSON.stringify(animaGraph, null, 2),
        configSchema: {
            seed: { nodeId: '46:6', input: 'seed' },
            steps: { nodeId: '46:6', input: 'steps' },
            cfg: { nodeId: '46:6', input: 'cfg' },
            samplerName: { nodeId: '46:6', input: 'sampler_name' },
            denoise: { nodeId: '46:6', input: 'denoise' },
            width: { nodeId: '123:78', input: 'width' },
            height: { nodeId: '123:78', input: 'height' },
            batchSize: { nodeId: '123:78', input: 'batch_size' },
            positivePrompt: { nodeId: '100', input: 'PromptStackState' },
            negativePrompt: { nodeId: '48', input: 'PromptStackState' },
            loraData: { nodeId: '47', input: 'lora_data' },
            initImagePath: { nodeId: '75', input: 'image' },
        },
    },
    {
        id: 'fixture-tagger',
        name: 'Tagger',
        archivedAt: null,
        graphText: '',
        configSchema: {},
    },
    {
        id: 'fixture-anima-v0',
        name: 'Anima v0',
        archivedAt: Date.parse('2026-08-01T00:00:00.000Z'),
        graphText: JSON.stringify(animaGraph, null, 2),
        configSchema: {
            seed: { nodeId: '46:6', input: 'seed' },
            steps: { nodeId: '46:6', input: 'steps' },
            positivePrompt: { nodeId: '100', input: 'PromptStackState' },
        },
    },
]
