import { t } from '#/lib/i18n'

import type { ImageApi } from '@silent-pix/shared'

export function originLabel(origin: ImageApi.ImageUsage | null): string | null {
    if (!origin) {
        return null
    }

    const taskLabel = origin.taskName ?? origin.taskId.slice(0, 8)
    return origin.type === 'output'
        ? t('image.originOutput', { task: taskLabel, index: origin.sortIndex + 1 })
        : t('image.originInput', { task: taskLabel })
}
