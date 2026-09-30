import { treaty } from '@elysia/eden'

import type { Treaty } from '@elysia/eden'
import type { Api } from '@silent-pix/server/api'
import type { AppApi } from '@silent-pix/shared'

const requestTimeoutMs = 10_000

export type ApiClient = Treaty.Create<Api, AppApi.ClientHeaders>

export const clientId = crypto.randomUUID()

let activeEndpoint: string | undefined
let activeClient: ApiClient | undefined

export function initializeApiClient(endpoint: string): void {
    const url = new URL(endpoint)
    activeEndpoint = url.origin
    activeClient = createApiClient(activeEndpoint)
}

export function createApiClient(endpoint: string): ApiClient {
    return treaty<Api, AppApi.ClientHeaders>(endpoint, {
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
}

export function getApiClient(): ApiClient {
    if (!activeClient) {
        throw new Error('API client must be initialized before making requests.')
    }

    return activeClient
}

export function getApiEndpoint(): string {
    if (!activeEndpoint) {
        throw new Error('API endpoint must be initialized before resolving resources.')
    }

    return activeEndpoint
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
