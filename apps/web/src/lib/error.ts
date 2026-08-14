import { ApiError, networkErrorCode, unexpectedErrorCode } from '#/api/api.client'

import type { ZodError } from 'zod'

export type ZodIssue = ZodError['issues'][number]

/*
 * 使用者看得到的文案由前端決定，後端的 message 只當保底。
 * 每一句都要交代「怎麼辦」，不要只說失敗。
 */
const messageByCode: Record<string, string> = {
    [networkErrorCode]: 'Server is unreachable. Start the backend and try again.',
    [unexpectedErrorCode]: 'The server returned an unexpected response.',
    COMFY_LORA_LIST_INVALID: 'ComfyUI returned an unreadable LoRA list.',
    COMFY_OBJECT_INFO_INVALID: 'ComfyUI returned unreadable sampler options.',
    COMFY_OUTPUT_MISSING: 'ComfyUI finished without producing an image.',
    COMFY_TIMEOUT: 'ComfyUI stopped responding.',
    COMFY_UNAVAILABLE: 'ComfyUI is not running. Start it, then retry.',
    INTERNAL_SERVER_ERROR: 'The server hit an unexpected error. Check its console.',
    INVALID_TASK_CURSOR: 'The task list is out of sync. Reload to continue.',
    TASK_GENERATE_ERROR: 'Generation failed. Check the ComfyUI console for details.',
    VALIDATION_ERROR: 'The server rejected the request as invalid.',
    WORKFLOW_NOT_FOUND: 'That workflow is gone. The list has been refreshed — pick one and try again.',
}

/*
 * 對方已經明確不在了就別重試——ComfyUI 沒開，再試三次還是沒開，
 * 只會讓錯誤訊息晚好幾秒才出現。4xx 同理，是請求本身的問題。
 */
const noRetryCodes = new Set([
    networkErrorCode,
    'COMFY_TIMEOUT',
    'COMFY_UNAVAILABLE',
])

export function shouldRetryQuery(failureCount: number, error: unknown): boolean {
    if (error instanceof ApiError) {
        if (noRetryCodes.has(error.code)) {
            return false
        }

        if (error.status >= 400 && error.status < 500) {
            return false
        }
    }

    return failureCount < 1
}

export function toErrorMessage(error: unknown): string {
    if (error instanceof ApiError) {
        return messageByCode[error.code] ?? error.message ?? 'Something went wrong.'
    }

    return 'Something went wrong.'
}

/*
 * Zod 預設訊息長得像 "Too big: expected number to be <=100"，
 * 那是給開發者看的。這裡改寫成使用者讀得懂的句子。
 */
export function toIssueMessage(issue: ZodIssue): string {
    switch (issue.code) {
        case 'too_big':
            return issue.origin === 'string'
                ? `Must be ${issue.maximum} characters or less.`
                : `Must be ${issue.maximum} or less.`
        case 'too_small':
            return issue.origin === 'string'
                ? `Must be at least ${issue.minimum} characters.`
                : `Must be ${issue.minimum} or more.`
        case 'invalid_type':
            return 'Enter a valid value.'
        default:
            return issue.message
    }
}
