import { Badge } from '#/components/base/Badge'

import type { TaskApi } from '@silent-pix/shared'
import type { BadgeTone } from '#/components/base/Badge'

type TaskStatusProps = {
    status: TaskApi.TaskStatus
}

type Item = {
    label: string
    tone: BadgeTone
}

const statusMap: Record<TaskApi.TaskStatus, Item> = {
    queued: {
        label: 'Queued',
        tone: 'warning',
    },
    running: {
        label: 'Running',
        tone: 'info',
    },
    done: {
        label: 'Done',
        tone: 'success',
    },
    failed: {
        label: 'Failed',
        tone: 'danger',
    },
}

export function TaskStatus(props: TaskStatusProps) {
    const status = () => statusMap[props.status]

    return <Badge tone={status().tone}>{status().label}</Badge>
}
