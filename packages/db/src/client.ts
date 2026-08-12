import { mkdir } from 'node:fs/promises'
import { dirname } from 'node:path'

import { createClient } from '@libsql/client'
import { drizzle } from 'drizzle-orm/libsql'

import * as schema from '#/schema/schema.export'

import type { LibSQLDatabase } from 'drizzle-orm/libsql'

export type DatabaseClient = {
    db: LibSQLDatabase<typeof schema>
    check: () => Promise<boolean>
    close: () => void
}

export async function createDatabaseClient(databasePath: string): Promise<DatabaseClient> {
    await mkdir(dirname(databasePath), { recursive: true })

    const client = createClient({
        url: `file:${databasePath}`,
    })

    await client.execute('PRAGMA foreign_keys = ON')

    const db = drizzle({
        client,
        schema,
    })

    let closed = false

    return {
        db,
        async check() {
            try {
                if (closed) {
                    throw new Error('Database client is closed.')
                }

                await client.execute('SELECT 1')
                return true
            } catch {
                return false
            }
        },
        close() {
            if (!closed) {
                client.close()
                closed = true
            }
        },
    }
}
