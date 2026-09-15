import { randomUUID } from 'node:crypto'
import { access, mkdir, readFile, rename, unlink, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'

import { loadConfig } from '#/config'
import { isFileNotFoundError } from '#/lib/error/node.error'

import type { ImageApi } from '@silent-pix/shared'

const config = loadConfig()

const extensionByMime: Record<ImageApi.ImageMime, string> = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
}

/* images/<hash>.<ext>，單層平放 */
export function contentPath(hash: string, mime: ImageApi.ImageMime): string {
    return `images/${hash}.${extensionByMime[mime]}`
}

export function absolutePath(relativePath: string): string {
    return resolve(config.appStorageDir, relativePath)
}

export async function contentExists(relativePath: string): Promise<boolean> {
    try {
        await access(absolutePath(relativePath))
        return true
    } catch {
        return false
    }
}

export function readContent(relativePath: string): Promise<Buffer> {
    return readFile(absolutePath(relativePath))
}

/* 寫入 image。先寫暫存檔再 rename，防止中途失敗污染 storage */
export async function writeContent(
    relativePath: string,
    bytes: Uint8Array,
): Promise<void> {
    const target = absolutePath(relativePath)
    const temporary = `${target}.tmp-${randomUUID()}`

    await mkdir(dirname(target), { recursive: true })

    try {
        await writeFile(temporary, bytes)
        await rename(temporary, target)
    } catch (cause) {
        await unlinkQuietly(temporary)
        throw cause
    }
}

export async function unlinkContent(relativePath: string): Promise<boolean> {
    return unlinkQuietly(absolutePath(relativePath))
}

async function unlinkQuietly(filePath: string): Promise<boolean> {
    try {
        await unlink(filePath)
        return true
    } catch (cause) {
        if (isFileNotFoundError(cause)) {
            return false
        }
        throw cause
    }
}
