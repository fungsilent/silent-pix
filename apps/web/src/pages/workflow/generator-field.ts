import { config } from '@silent-pix/shared'

import { t } from '#/lib/i18n'

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
    referenceImagePath: 'Other',
    maskImagePath: 'Other',
}

const groupOrder = ['Sampler', 'Latent', 'Prompt', 'Other'] as const satisfies readonly GroupLabel[]

const fieldLabels = {
    seed: 'fields.seed',
    steps: 'fields.steps',
    cfg: 'fields.cfg',
    samplerName: 'fields.sampler',
    denoise: 'fields.denoise',
    width: 'fields.width',
    height: 'fields.height',
    batchSize: 'fields.batch',
    positivePrompt: 'fields.positive',
    negativePrompt: 'fields.negative',
    loraData: 'fields.lora',
    referenceImagePath: 'workflow.mapping.referenceImagePath',
    maskImagePath: 'workflow.mapping.maskImagePath',
} as const satisfies Record<GeneratorField, string>

export function generatorFieldLabel(field: GeneratorField): string {
    return t(fieldLabels[field])
}

export type FieldGroup = {
    label: () => string
    fields: readonly GeneratorField[]
}

/* 組的先後由 groupOrder 決定，組內順序沿用 shared 的欄位順序 */
export const fieldGroups: readonly FieldGroup[] = groupOrder.map(label => ({
    label: () => t('workflow.groups', { returnObjects: true })[label],
    fields: config.generatorFields.filter(field => groupOf[field] === label),
}))
