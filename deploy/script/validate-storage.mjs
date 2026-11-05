import assert from 'node:assert/strict'
import { isAbsolute, relative } from 'node:path'

for (const name of ['APP_DATA_DIR', 'DATABASE_PATH', 'APP_STORAGE_DIR', 'COMFYUI_OUTPUT_DIR']) {
    assert(process.env[name] && isAbsolute(process.env[name]), `${name} must be an absolute Linux path for Docker`)
}

// Keep SQLite and its journal inside the persistent directory mount.
const databasePath = relative(process.env.APP_DATA_DIR, process.env.DATABASE_PATH)
assert(databasePath && databasePath !== '..' && !databasePath.startsWith('../') && !isAbsolute(databasePath),
    'DATABASE_PATH must be inside APP_DATA_DIR for Docker')
