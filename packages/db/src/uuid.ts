import { v4, validate } from 'uuid'

export type UUID = `${string}-${string}-${string}-${string}-${string}`

export function createUUID(): UUID {
    return v4() as UUID
}

export function isUUID(value: string): value is UUID {
    return validate(value)
}

export function assertUUID(value: string, label: string): asserts value is UUID {
    if (!isUUID(value)) {
        throw new Error(`${label} must be a UUID.`)
    }
}
