import { treaty } from '@elysia/eden'

import type { Treaty } from '@elysia/eden'
import type { Api } from '@silent-pix/server/api'
import type { AppApi } from '@silent-pix/shared'

const requestTimeoutMs = 10_000

export const clientId = crypto.randomUUID()

export const apiClient: Treaty.Create<Api, { 'client-id': string }> = treaty<Api, { 'client-id': string }>(window.location.origin, {
    parseDate: false,
    throwHttpError: false,
    fetcher: (input, init) => {
        const headers = new Headers()

        if (init?.headers) {
            new Headers(init.headers).forEach((value, key) => {
                headers.set(key, value)
            })
        }
        headers.set('client-id', clientId)

        return fetch(input, {
            ...init,
            headers,
            signal: init?.signal ?? AbortSignal.timeout(requestTimeoutMs),
        })
    },
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

export const networkErrorCode = 'NETWORK_ERROR'
export const unexpectedErrorCode = 'UNEXPECTED_ERROR'

type TreatyError = {
    status: number
    value: AppApi.ErrorResponse
}
type InternalTreatyResult<TData, TError extends TreatyError> = {
    data: TData
    error: null
} | {
    data: null
    error: TError
}

export async function unwrap<
    TData,
    TError extends TreatyError,
>(
    request: Promise<InternalTreatyResult<TData, TError>>,
    mapDeclaredError?: (error: TError) => ApiError,
): Promise<NonNullable<TData>> {
    const { data, error } = await request

    if (error) {
        throw toApiError(error, mapDeclaredError)
    }

    return data as NonNullable<TData>
}

export function toApiError<TError extends TreatyError>(
    error: TError,
    mapDeclaredError?: (error: TError) => ApiError,
): ApiError {
    if (error.value instanceof Error) {
        return new ApiError(error.status, networkErrorCode, 'Server is unreachable.')
    }

    try {
        if (mapDeclaredError) {
            return mapDeclaredError(error)
        }

        return new ApiError(error.status, error.value.error.code, error.value.error.message)
    }
    catch {
        return new ApiError(error.status, unexpectedErrorCode, 'The server returned an unexpected response.')
    }
}
