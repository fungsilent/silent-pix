import { appApi, imageApi } from '@silent-pix/shared'

import { loadConfig } from '#/config'

const garbageCollectionPath = '/api/image/garbage-collection'
const requestTimeoutMs = 30_000

try {
    const response = await requestImageGarbageCollection()
    const body: unknown = await response.json()

    if (response.status === 200) {
        const result = imageApi.imageGarbageCollectionResponse.safeParse(body)
        if (!result.success) {
            throw new Error('Server returned an invalid garbage-collection response.')
        }

        console.log(JSON.stringify(result.data))
        if (result.data.unlinkFailureCount > 0) {
            process.exitCode = 1
        }
    }
    else {
        const result = appApi.errorResponse.safeParse(body)
        if (!result.success) {
            throw new Error(`Server responded with HTTP ${response.status} and an invalid error body.`)
        }

        throw new Error(`Garbage collection failed (${response.status}): ${result.data.error.message}`)
    }
}
catch (cause) {
    if (isConnectionRefused(cause)) {
        console.error('Image garbage collection server is unavailable (connection refused).')
    }
    else if (isTimeout(cause)) {
        console.error('Image garbage collection result is unknown because the server request timed out.')
    }
    else {
        console.error('Image garbage collection failed:', cause instanceof Error ? cause.message : cause)
    }

    process.exitCode = 1
}

async function requestImageGarbageCollection(): Promise<Response> {
    const serverOrigin = `http://127.0.0.1:${loadConfig().serverPort}`
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), requestTimeoutMs)

    try {
        return await fetch(new URL(garbageCollectionPath, `${serverOrigin}/`), {
            method: 'POST',
            signal: controller.signal,
        })
    }
    finally {
        clearTimeout(timeout)
    }
}

function isTimeout(cause: unknown): boolean {
    return cause instanceof Error && cause.name === 'AbortError'
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
