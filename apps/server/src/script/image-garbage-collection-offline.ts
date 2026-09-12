import { createDatabaseClient } from '@silent-pix/db'

import { loadConfig } from '#/config'
import { imageGarbageCollection } from '#/module/image/image.garbage'

const confirmationFlag = '--confirm-server-stopped'
const probeTimeoutMs = 3_000

const rawArgs = process.argv.slice(2)
const args = rawArgs[0] === '--' ? rawArgs.slice(1) : rawArgs
if (args.length !== 1 || args[0] !== confirmationFlag) {
    console.error(`Refusing offline image garbage collection without the exact ${confirmationFlag} flag.`)
    process.exitCode = 1
}
else {
    try {
        const config = loadConfig()
        await requireServerStopped(config.serverPort)

        const database = await createDatabaseClient(config.databasePath)

        try {
            const result = await imageGarbageCollection.collect(database, {
                storageRoot: config.appStorageDir,
            })
            console.log(JSON.stringify(result))

            if (result.unlinkFailureCount > 0) {
                process.exitCode = 1
            }
        }
        finally {
            database.close()
        }
    }
    catch (cause) {
        console.error('Offline image garbage collection refused or failed:', cause instanceof Error ? cause.message : cause)
        process.exitCode = 1
    }
}

async function requireServerStopped(serverPort: number): Promise<void> {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), probeTimeoutMs)

    try {
        await fetch(new URL('/api/health', `http://127.0.0.1:${serverPort}/`), {
            signal: controller.signal,
        })
    }
    catch (cause) {
        if (isConnectionRefused(cause)) {
            return
        }

        throw new Error('Could not prove that the server is stopped; refusing offline cleanup.', { cause })
    }
    finally {
        clearTimeout(timeout)
    }

    throw new Error('The server responded to the probe; refusing offline cleanup.')
}

function isConnectionRefused(cause: unknown): boolean {
    let current: unknown = cause

    while (current && typeof current === 'object') {
        if ('code' in current && current.code === 'ECONNREFUSED') {
            return true
        }

        current = 'cause' in current ? current.cause : undefined
    }

    return false
}
