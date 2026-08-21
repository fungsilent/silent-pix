import type { ImageApi } from '@silent-pix/shared'

export function originLabel(origin: ImageApi.ImageUsage | null): string | null {
    if (!origin) {
        return null
    }

    const taskLabel = origin.taskName ?? origin.taskId.slice(0, 8)
    return origin.type === 'output'
        ? `${taskLabel} #${origin.sortIndex + 1}`
        : `${taskLabel} input`
}
