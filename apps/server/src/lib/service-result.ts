type ServiceDone<TData> = {
    ok: true
    data: TData
}

type ServiceFailure<TError extends string> = {
    ok: false
    error: TError
}

export type ServiceResult<TData, TError extends string> =
    | ServiceDone<TData>
    | ServiceFailure<TError>

export function done<TData>(data: TData): ServiceDone<TData> {
    return {
        ok: true,
        data,
    }
}

export function fail<TError extends string>(error: TError): ServiceFailure<TError> {
    return {
        ok: false,
        error,
    }
}