export function isFileNotFoundError(cause: unknown): boolean {
    return cause instanceof Error
        && 'code' in cause
        && cause.code === 'ENOENT'
}

export function isConnectionRefused(cause: unknown): boolean {
    let current: unknown = cause

    while (current && typeof current === 'object') {
        if ('code' in current && current.code === 'ECONNREFUSED') {
            return true
        }

        current = 'cause' in current ? current.cause : undefined
    }

    return false
}
