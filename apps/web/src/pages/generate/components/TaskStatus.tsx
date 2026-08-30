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

/* badge 只有底色 + 文字色，不加邊框、不加圓點——文字本身已說明狀態 */
const statusMap: Record<TaskApi.TaskStatus, Item> = {
    queued: {
        label: 'Queued',
        tone: 'amber',
    },
    running: {
        label: 'Running',
        tone: 'sky',
    },
    done: {
        label: 'Done',
        tone: 'emerald',
    },
    failed: {
        label: 'Failed',
        tone: 'rose',
    },
}

export function TaskStatus(props: TaskStatusProps) {
    const status = () => statusMap[props.status]
    const label = () => status().label

    return (
        <Badge tone={status().tone}>
            {label()}
        </Badge>
    )
}
