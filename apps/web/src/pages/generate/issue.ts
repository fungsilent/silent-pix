import { toErrorMessage, toIssueMessage } from '#/lib/error'

import type { ZodIssue } from '#/lib/error'
import type { AppIssue } from '#/lib/issue'
import type { GenerateValues } from '#/pages/generate/form'

export type GenerateIssue = AppIssue

export const generateFieldLabel: Record<keyof GenerateValues, string> = {
    batch: 'Batch',
    cfg: 'CFG',
    denoise: 'Denoise',
    height: 'Height',
    lora: 'LoRA',
    name: 'Name',
    negative: 'Negative',
    positive: 'Positive',
    referenceImage: 'Reference image',
    sampler: 'Sampler',
    seed: 'Seed',
    steps: 'Steps',
    width: 'Width',
    workflowId: 'Workflow',
}

export function toValidationIssues(issues: ZodIssue[]): GenerateIssue[] {
    return issues.map((issue, index) => {
        const key = issue.path[0]
        const isKnownField = typeof key === 'string' && key in generateFieldLabel

        return {
            id: `validation-${index}`,
            tone: 'error',
            field: isKnownField ? generateFieldLabel[key as keyof GenerateValues] : undefined,
            /* workflowId 空字串會被 z.uuid() 判成格式錯誤，但那不是使用者打錯字 */
            message: key === 'workflowId' ? 'Select a workflow.' : toIssueMessage(issue),
        }
    })
}

export function toSubmitIssue(error: unknown): GenerateIssue {
    return {
        id: 'submit',
        tone: 'error',
        message: toErrorMessage(error),
    }
}
