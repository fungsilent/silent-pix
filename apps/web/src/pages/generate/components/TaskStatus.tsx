import { Badge } from '#/components/base/Badge'

import type { TaskStatus as TaskStatusValue } from '@silent-pix/shared'

type TaskStatusProps = {
    status: TaskStatusValue
}

type Item = {
    label: string
    class: string
}

const statusMap: Record<TaskStatusValue, Item> = {
    queued: {
        label: 'Queued',
        class: 'border-amber-500/50 bg-amber-500/15 text-amber-300',
    },
    running: {
        label: 'Running',
        class: 'border-sky-500/50 bg-sky-500/15 text-sky-300',
    },
    done: {
        label: 'Done',
        class: 'border-emerald-500/50 bg-emerald-500/15 text-emerald-300',
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
