import { Badge } from '#/components/base/Badge'
import { t } from '#/lib/i18n'

import type { TaskApi } from '@silent-pix/shared'
import type { BadgeTone } from '#/components/base/Badge'

type TaskStatusProps = {
    status: TaskApi.TaskStatus
}

type Item = {
    label: () => string
    tone: BadgeTone
}

const statusMap: Record<TaskApi.TaskStatus, Item> = {
    queued: {
        label: () => t('task.status.queued'),
        tone: 'warning',
    },
    running: {
        label: () => t('task.status.running'),
        tone: 'info',
    },
    done: {
        label: () => t('task.status.done'),
        tone: 'success',
    },
    failed: {
        label: () => t('task.status.failed'),
        tone: 'danger',
    },
}

export function TaskStatus(props: TaskStatusProps) {
    const status = () => statusMap[props.status]

    return <Badge tone={status().tone}>{status().label()}</Badge>
}
