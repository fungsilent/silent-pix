import { toErrorMessage, toIssueMessage } from '#/lib/error'
import { t } from '#/lib/i18n'

import type { ZodIssue } from '#/lib/error'
import type { AppIssue } from '#/lib/issue'
import type { GenerateValues } from '#/pages/generate/form'

export type GenerateIssue = AppIssue

export const generateFieldLabel: Record<keyof GenerateValues, () => string> = {
    batch: () => t('fields.batch'),
    cfg: () => t('fields.cfg'),
    denoise: () => t('fields.denoise'),
    height: () => t('fields.height'),
    lora: () => t('fields.lora'),
    name: () => t('fields.name'),
    negative: () => t('fields.negative'),
    positive: () => t('fields.positive'),
    referenceImage: () => t('fields.referenceImage'),
    sampler: () => t('fields.sampler'),
    seed: () => t('fields.seed'),
    steps: () => t('fields.steps'),
    width: () => t('fields.width'),
    workflowId: () => t('fields.workflow'),
}

export function toValidationIssues(issues: ZodIssue[]): GenerateIssue[] {
    return issues.map((issue, index) => {
        const key = issue.path[0]
        const isKnownField = typeof key === 'string' && key in generateFieldLabel

        return {
            id: `validation-${index}`,
            tone: 'error',
            field: () => isKnownField ? generateFieldLabel[key as keyof GenerateValues]() : undefined,
            /* workflowId 空字串會被 z.uuid() 判成格式錯誤，但那不是使用者打錯字 */
            message: () => key === 'workflowId' ? t('generate.selectWorkflow') : toIssueMessage(issue),
        }
    })
}

export function toSubmitIssue(error: unknown): GenerateIssue {
    return {
        id: 'submit',
        tone: 'error',
        message: () => toErrorMessage(error),
    }
}
