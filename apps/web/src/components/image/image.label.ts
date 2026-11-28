import { t } from '#/lib/i18n'

import type { ImageApi } from '@silent-pix/shared'

export function originTaskLabel(origin: ImageApi.ImageUsage): string {
    const taskLabel = origin.taskName ?? origin.taskId.slice(0, 8)
    return origin.type === 'output'
        ? t('image.originOutput', { task: taskLabel, index: origin.sortIndex + 1 })
        : taskLabel
}
