import { CircleX, Hourglass, Image as ImageIcon, LoaderCircle } from 'lucide-solid'

import type { TaskApi } from '@silent-pix/shared'
import type { LucideProps } from 'lucide-solid'
import type { Component } from 'solid-js'

export type TaskPlaceholderMeta = {
    Icon: Component<LucideProps>
    class: string
    label: string
}

/* status placeholder 的 icon 與顏色沿用現行，不得更動 */
export const placeholderMap: Record<TaskApi.TaskStatus, TaskPlaceholderMeta> = {
    done: {
        Icon: ImageIcon,
        class: 'border-line-subtle bg-elevated text-fg-muted',
        label: 'No thumbnail',
    },
    queued: {
        Icon: Hourglass,
        class: 'border-amber-500/30 bg-amber-500/10 text-amber-300',
        label: 'Queued task thumbnail pending',
    },
    running: {
        Icon: LoaderCircle,
        class: 'border-sky-500/30 bg-sky-500/10 text-sky-300',
        label: 'Running task thumbnail pending',
    },
    failed: {
        Icon: CircleX,
        class: 'border-rose-500/30 bg-rose-500/10 text-rose-300',
        label: 'Task failed',
    },
}
