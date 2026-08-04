import { sql } from 'drizzle-orm'

import type { UUID } from '#/uuid'

export type JsonObject = Record<string, unknown>

export type UpdateData<T> = Partial<Omit<T, 'id'>> & {
    id: UUID
}

export const uuidCheck = (column: unknown) => sql`
    length(${column}) = 36
    AND substr(${column}, 9, 1) = '-'
    AND substr(${column}, 14, 1) = '-'
    AND substr(${column}, 19, 1) = '-'
    AND substr(${column}, 24, 1) = '-'
    AND lower(${column}) NOT GLOB '*[^0-9a-f-]*'
`
