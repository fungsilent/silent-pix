import type { ApiFailure, ApiSuccess } from '@silent-pix/shared'

export function ok<TData>(data: TData): ApiSuccess<TData> {
    return {
        ok: true,
        data,
    }
}

export function fail(code: string, message: string): ApiFailure {
    return {
        ok: false,
        error: {
            code,
            message,
        },
    }
}
