import { config } from '@silent-pix/shared'

import type { GeneratorField } from '@silent-pix/shared'

/*
 * 分組純粹是 editor 的排版，shared 不需要知道。
 * Record 逼出完整性：shared 加了 field 而這裡沒歸類，web 就編不過。
 */
type GroupLabel = 'Sampler' | 'Latent' | 'Prompt' | 'Other'

const groupOf: Record<GeneratorField, GroupLabel> = {
    seed: 'Sampler',
    steps: 'Sampler',
    cfg: 'Sampler',
    samplerName: 'Sampler',
    denoise: 'Sampler',
    width: 'Latent',
    height: 'Latent',
    batchSize: 'Latent',
    positivePrompt: 'Prompt',
    negativePrompt: 'Prompt',
    loraData: 'Other',
    initImagePath: 'Other',
}

const groupOrder = ['Sampler', 'Latent', 'Prompt', 'Other'] as const satisfies readonly GroupLabel[]

export type FieldGroup = {
    label: GroupLabel
    fields: readonly GeneratorField[]
}

/* 組的先後由 groupOrder 決定，組內順序沿用 shared 的欄位順序 */
export const fieldGroups: readonly FieldGroup[] = groupOrder.map(label => ({
    label,
    fields: config.generatorFields.filter(field => groupOf[field] === label),
}))
