type ServiceDone<TData> = {
    ok: true
    data: TData
}

type ServiceFailure<TError extends string, TData = undefined> = {
    ok: false
    error: TError
    data: TData
}

export function done<TData>(data: TData): ServiceDone<TData> {
    return {
        ok: true,
        data,
    }
}

export function fail<TError extends string>(error: TError): ServiceFailure<TError>
export function fail<TError extends string, TData>(error: TError, data: TData): ServiceFailure<TError, TData>
export function fail<TError extends string>(error: TError, data?: unknown) {
    return {
        ok: false as const,
        error,
        data,
    }
}
