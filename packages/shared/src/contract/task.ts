import { z } from 'zod'

/* MARK: primitives */

export const taskStatus = z.enum(['queued', 'running', 'done', 'failed'])

export const taskFlag = z.enum(['pin', 'discard'])

export const taskFilterFlag = z.enum(['unflag', 'pin', 'discard'])

/* MARK: values */

const taskPromptGroup = z.object({
    id: z.string().trim().min(1).max(160),
    name: z.string().trim().min(1).max(120),
    fromLine: z.number().int().min(1),
    toLine: z.number().int().min(1),
    enabled: z.boolean(),
    disabledTokenIndexes: z.array(z.number().int().nonnegative()),
})

export const taskPromptDocument = z.object({
    text: z.string(),
    groups: z.array(taskPromptGroup).min(1),
}).superRefine(validatePromptDocument)

export const taskPrompt = z.object({
    positive: taskPromptDocument,
    negative: taskPromptDocument,
})

export const taskLora = z.object({
    id: z.string(),
    name: z.string(),
    weight: z.number(),
})

export const taskConfig = z.object({
    seed: z.string().trim().min(1).max(64),
    steps: z.number().int().min(1).max(100),
    cfg: z.number().finite().min(0).max(100),
    width: z.number().int().positive(),
    height: z.number().int().positive(),
    batch: z.number().int().min(1).max(16),
    sampler: z.string().trim().min(1).max(120),
    denoise: z.number().finite().min(0).max(1).default(1),
})

export const taskGenerateConfig = z.object({
    config: taskConfig,
    lora: z.array(taskLora),
    prompt: taskPrompt,
})

/* MARK: resources */

export const taskListItem = z.object({
    id: z.uuid(),
    name: z.string().nullable(),
    status: taskStatus,
    pin: z.boolean(),
    discard: z.boolean(),
    outputCount: z.number().int().nonnegative(),
    createdAt: z.iso.datetime(),
    thumbnail: z.string().optional(),
})

/* MARK: validation */

/* NOTE: 逗號是唯一 delimiter。 */
function countPromptTokens(text: string): number {
    return text.split(',').filter(segment => segment.trim().length > 0).length
}

/*
 * INVARIANT:
 * - group 依序、無 gap、無 overlap，完整覆蓋每一行。
 * - group id 唯一。
 * - disabled token index 嚴格遞增且落在該組 token 數量內。
 */
function validatePromptDocument(
    document: { text: string, groups: z.output<typeof taskPromptGroup>[] },
    context: z.RefinementCtx,
): void {
    const lines = document.text.split('\n')
    const ids = new Set<string>()

    document.groups.forEach((group, index) => {
        const expectedFromLine = index === 0 ? 1 : (document.groups[index - 1]?.toLine ?? 0) + 1

        if (group.fromLine !== expectedFromLine) {
            context.addIssue({
                code: 'custom',
                message: 'Prompt groups must be ordered without gaps or overlaps.',
                path: ['groups', index, 'fromLine'],
            })
        }

        if (group.toLine < group.fromLine) {
            context.addIssue({
                code: 'custom',
                message: 'Prompt group must cover at least one line.',
                path: ['groups', index, 'toLine'],
            })
        }

        if (ids.has(group.id)) {
            context.addIssue({
                code: 'custom',
                message: 'Prompt group ids must be unique.',
                path: ['groups', index, 'id'],
            })
        }
        ids.add(group.id)

        const tokenCount = countPromptTokens(
            lines.slice(group.fromLine - 1, group.toLine).join('\n'),
        )
        let previous = -1

        group.disabledTokenIndexes.forEach((tokenIndex, position) => {
            if (tokenIndex <= previous || tokenIndex >= tokenCount) {
                context.addIssue({
                    code: 'custom',
                    message: 'Disabled token indexes must be sorted, unique and in range.',
                    path: ['groups', index, 'disabledTokenIndexes', position],
                })
            }
            previous = tokenIndex
        })
    })

    const last = document.groups[document.groups.length - 1]
    if (last && last.toLine !== lines.length) {
        context.addIssue({
            code: 'custom',
            message: 'Prompt groups must cover every line of the document.',
            path: ['groups', document.groups.length - 1, 'toLine'],
        })
    }
}

/* MARK: inferred types */

export type TaskStatus = z.output<typeof taskStatus>
export type TaskFlag = z.output<typeof taskFlag>
export type TaskFilterFlag = z.output<typeof taskFilterFlag>
export type TaskPromptGroup = z.output<typeof taskPromptGroup>
export type TaskPromptDocument = z.output<typeof taskPromptDocument>
export type TaskGenerateConfig = z.output<typeof taskGenerateConfig>
export type TaskListItem = z.output<typeof taskListItem>
