import { imageUrl } from '#/module/image/image.util'

import type { ImageSelect, TaskImageSelect } from '@silent-pix/db'
import type { ImageApi } from '@silent-pix/shared'

export type ImageModel = ImageSelect

export function toImageResource(image: ImageSelect): ImageApi.ImageResource {
    return {
        id: image.id,
        url: imageUrl(image.id),
        mime: image.mime,
        width: image.width,
        height: image.height,
        sizeBytes: image.sizeBytes,
        createdAt: new Date(image.createdAt).toISOString(),
    }
}

/*
 * mask / control 還沒有 UI，對外只承認 input 與 output 兩種身分，
 * 免得 contract 先長出前端還讀不懂的值。
 */
export function toImageUsageType(type: TaskImageSelect['type']): ImageApi.ImageUsage['type'] | undefined {
    return type === 'input' || type === 'output' ? type : undefined
}
