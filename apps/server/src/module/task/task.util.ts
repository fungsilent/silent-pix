import { extname } from 'node:path'

import { createUUID } from '@silent-pix/db'

import type { JsonObject } from '@silent-pix/db'
import type { GenerateConfig } from '#/lib/comfy/comfy.prompt'

export function contentType(filename: string): string {
    switch (extname(filename).toLowerCase()) {
        case '.avif':
            return 'image/avif'
        case '.jpeg':
        case '.jpg':
            return 'image/jpeg'
        case '.png':
            return 'image/png'
        case '.webp':
            return 'image/webp'
        default:
            return 'application/octet-stream'
    }
}

export function parseTaskConfig(value: JsonObject): GenerateConfig {
    return value as GenerateConfig
}

export function imageUrl(taskId: string, filename: string): string {
    return `/api/task/${taskId}/image/${encodeURIComponent(filename)}`
}

export function imageFilename(originFilename: string) {
    const imageId = createUUID()
    const extension = extname(originFilename).replace(/[^a-zA-Z0-9.]/g, '')

    return {
        imageId,
        filename: `${imageId}${extension}`,
    }
}
