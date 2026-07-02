import { dirname, isAbsolute, resolve } from 'node:path'

import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'

export type DatabaseClient = ReturnType<typeof createDatabaseClient>

export type DatabaseClientOptions = {
    baseDir?: string
}

export function createDatabaseClient(databasePath: string, options: DatabaseClientOptions = {}) {
    const resolvedDatabasePath = resolveDatabasePath(databasePath, options)
    const sqlite = new Database(resolvedDatabasePath)

    sqlite.pragma('journal_mode = WAL')
    sqlite.pragma('foreign_keys = ON')
    sqlite.pragma('busy_timeout = 5000')

    return drizzle(sqlite)
}

export function resolveDatabasePath(databasePath: string, options: DatabaseClientOptions = {}): string {
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
