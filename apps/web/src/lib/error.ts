import { ApiError, networkErrorCode } from '#/api/api.client'
import { t } from '#/lib/i18n'

import type { ZodError } from 'zod'

export type ZodIssue = ZodError['issues'][number]

/*
 * 使用者看得到的文案由前端決定，後端的 message 只當保底。
 * 每一句都要交代「怎麼辦」，不要只說失敗。
 */
const messageByCode = new Map(Object.entries(t('errors.api', { returnObjects: true })))

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
        return messageByCode.get(error.code) ?? error.message ?? t('errors.generic')
    }

    return t('errors.generic')
}

/*
 * Zod 預設訊息長得像 "Too big: expected number to be <=100"，
 * 那是給開發者看的。這裡改寫成使用者讀得懂的句子。
 */
export function toIssueMessage(issue: ZodIssue): string {
    switch (issue.code) {
        case 'too_big':
            return issue.origin === 'string'
                ? t('errors.validation.maxCharacters', { maximum: String(issue.maximum) })
                : t('errors.validation.maximum', { maximum: String(issue.maximum) })
        case 'too_small':
            return issue.origin === 'string'
                ? t('errors.validation.minCharacters', { minimum: String(issue.minimum) })
                : t('errors.validation.minimum', { minimum: String(issue.minimum) })
        case 'invalid_type':
            return t('errors.validation.invalidValue')
        default:
            return issue.message
    }
}
