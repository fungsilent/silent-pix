import { treaty } from '@elysia/eden'

import type { Treaty } from '@elysia/eden'
import type { Api } from '@silent-pix/server/api'

export const apiClient: Treaty.Create<Api> = treaty<Api>(window.location.origin, {
    parseDate: false,
    throwHttpError: false,
})

export class ApiError extends Error {
    readonly code: string
    readonly status: number

    constructor(status: number, code: string, message: string) {
        super(message)
        this.name = 'ApiError'
        this.code = code
        this.status = status
    }
}