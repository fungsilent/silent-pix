export type ApiSuccess<TData> = {
    ok: true
    data: TData
}

export type ApiFailure = {
    ok: false
    error: {
        code: string
        message: string
    }
}

export type ApiResponse<TData> = ApiSuccess<TData> | ApiFailure

export type TaskStatus = 'pending' | 'running' | 'completed' | 'failed' | 'canceled'

export type ImageKind = 'output' | 'thumbnail' | 'upload'

export type AppSettingValue = string | number | boolean | null

export type HealthDto = {
    status: 'ok'
    service: 'silent-pix-server'
}
