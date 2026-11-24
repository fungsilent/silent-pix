import type { ImageSelect, TaskImageSelect } from '@silent-pix/db'
import type { ImageApi } from '@silent-pix/shared'

export function toImageResource(image: ImageSelect): ImageApi.ImageResource {
    return {
        id: image.id,
        url: `/api/image/${image.id}`,
        mime: image.mime,
        width: image.width,
        height: image.height,
        sizeBytes: image.sizeBytes,
        createdAt: new Date(image.createdAt).toISOString(),
    }
}

/* 遮罩與控制圖不在圖庫顯示。 */
export function toImageUsageType(type: TaskImageSelect['type']): ImageApi.ImageUsage['type'] | undefined {
    return type === 'input' || type === 'output' ? type : undefined
}
