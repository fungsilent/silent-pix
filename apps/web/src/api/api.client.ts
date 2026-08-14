import { treaty } from '@elysia/eden'
import { appApi } from '@silent-pix/shared'

import type { Treaty } from '@elysia/eden'
import type { Api } from '@silent-pix/server/api'

const requestTimeoutMs = 10_000

export const apiClient: Treaty.Create<Api> = treaty<Api>(window.location.origin, {
    parseDate: false,
    throwHttpError: false,
    fetcher: (input, init) => fetch(input, {
        ...init,
        signal: withTimeout(init?.signal),
    }),
})

function withTimeout(signal: AbortSignal | null | undefined): AbortSignal {
    const timeout = AbortSignal.timeout(requestTimeoutMs)

    return signal ? AbortSignal.any([signal, timeout]) : timeout
}

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

type AnyResponse = Record<number, unknown>

export async function unwrap<
    TResponse extends Treaty.TreatyResponse<AnyResponse>,
>(request: Promise<TResponse>): Promise<NonNullable<TResponse['data']>> {
    const { data, error } = await request

    if (error) {
        throw toApiError(error)
    }

    return data as NonNullable<TResponse['data']>
}

function toApiError(error: Treaty.Error<Treaty.TreatyResponse<AnyResponse>>): ApiError {
    const body = appApi.errorResponse.safeParse(error.value)

    if (body.success) {
        return new ApiError(error.status, body.data.error.code, body.data.error.message)
    }

    if (error.value instanceof Error) {
        return new ApiError(error.status, networkErrorCode, 'Server is unreachable.')
    }

    return new ApiError(error.status, unexpectedErrorCode, 'The server returned an unexpected response.')
}
