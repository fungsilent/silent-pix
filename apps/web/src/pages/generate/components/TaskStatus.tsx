import { Badge } from '#/components/base/Badge'

import type { TaskApi } from '@silent-pix/shared'

type TaskStatusProps = {
    status: TaskApi.TaskStatus
}

type Item = {
    label: string
    class: string
}

/* badge 只有底色 + 文字色，不加邊框、不加圓點——文字本身已說明狀態 */
const statusMap: Record<TaskApi.TaskStatus, Item> = {
    queued: {
        label: 'Queued',
        class: 'bg-amber-500/15 text-amber-300',
    },
    running: {
        label: 'Running',
        class: 'bg-sky-500/15 text-sky-300',
    },
    done: {
        label: 'Done',
        class: 'bg-emerald-500/15 text-emerald-300',
    },
    failed: {
        label: 'Failed',
        class: 'bg-rose-500/15 text-rose-300',
    },
    cancelled: {
        label: 'Cancelled',
        class: 'bg-slate-500/15 text-slate-300',
    },
}

export function TaskStatus(props: TaskStatusProps) {
    const status = () => statusMap[props.status]
    const label = () => status().label
    const statusClass = () => status().class
    return (
        <Badge class={statusClass()}>
            {label()}
        </Badge>
    )
}
