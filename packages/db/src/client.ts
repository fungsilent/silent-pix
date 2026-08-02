import { mkdirSync } from 'node:fs'
import { dirname, isAbsolute, resolve } from 'node:path'

import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'

import { schema } from '#/schema'

import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3'

export type DatabaseClient = {
    db: BetterSQLite3Database<typeof schema>
    sqlite: Database.Database
    check: () => boolean
    close: () => void
}

export type DatabaseClientOptions = {
    baseDir?: string
}

export function createDatabaseClient(databasePath: string, options: DatabaseClientOptions = {}): DatabaseClient {
    const resolvedDatabasePath = resolveDatabasePath(databasePath, options)

    if (resolvedDatabasePath !== ':memory:') {
        mkdirSync(dirname(resolvedDatabasePath), { recursive: true })
    }

    const sqlite = new Database(resolvedDatabasePath)

    sqlite.pragma('journal_mode = WAL')
    sqlite.pragma('foreign_keys = ON')
    sqlite.pragma('busy_timeout = 5000')

    const db = drizzle(sqlite, { schema })
    let closed = false

    return {
        db,
        sqlite,
        check() {
            try {
                if (closed) {
                    throw new Error('Database client is closed.')
                }
                sqlite.prepare('SELECT 1').get()
                return true
            } catch {
                return false
            }
        },
        close() {
            if (!closed) {
                sqlite.close()
                closed = true
            }
        },
    }
}

export function resolveDatabasePath(databasePath: string, options: DatabaseClientOptions = {}): string {
    if (databasePath === ':memory:') {
        return databasePath
    }

    if (isAbsolute(databasePath)) {
        return databasePath
    }

    if (!options.baseDir) {
        throw new Error('Relative database paths require an explicit baseDir')
    }

    return resolve(options.baseDir, databasePath)
}

export function getDatabaseDirectory(databasePath: string): string {
    return dirname(databasePath)
}
