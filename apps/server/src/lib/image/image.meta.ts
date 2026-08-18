import { imageSize } from 'image-size'

import type { ImageApi } from '@silent-pix/shared'

export type ImageMeta = {
    mime: ImageApi.ImageMime
    width: number
    height: number
}

const mimeByType: Record<string, ImageApi.ImageMime> = {
    jpg: 'image/jpeg',
    png: 'image/png',
}

export function readImageMeta(bytes: Uint8Array): ImageMeta | undefined {
    let size

    try {
        size = imageSize(bytes)
    } catch {
        return undefined
    }

    const mime = size.type === undefined ? undefined : mimeByType[size.type]
    if (!mime) {
        return undefined
    }

    const rotated = size.orientation !== undefined && size.orientation >= 5 && size.orientation <= 8
    const width = rotated ? size.height : size.width
    const height = rotated ? size.width : size.height

    if (!Number.isInteger(width) || !Number.isInteger(height) || width <= 0 || height <= 0) {
        return undefined
    }

    return { mime, width, height }
}
