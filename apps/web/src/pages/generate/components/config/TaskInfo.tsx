import { Editable } from '#/components/field/Editable'
import { TaskStatus } from '#/pages/generate/components/TaskStatus'

import type { GenerateTask } from '#/pages/generate/store'
import type { JSX } from 'solid-js'

type TaskInfoProps = {
    task: GenerateTask
}

export function TaskInfo(props: TaskInfoProps) {
    return (
        <section class='flex flex-col gap-2'>
            <DetailRow label='ID'>
                <span class='text-sm font-bold leading-none text-white'>{props.task.id}</span>
            </DetailRow>

            <DetailRow label='Name'>
                <Editable
                    label='Name'
                    value={props.task.name}
                    classes={{
                        root: 'w-full',
                    }}
                />
            </DetailRow>

            <DetailRow label='Status'>
                {props.task.status && (
                    <TaskStatus status={props.task.status} />
                )}
            </DetailRow>

            <DetailRow label='Created'>
                <span class='text-sm leading-none text-white'>{props.task.createdAt ? new Date(props.task.createdAt).toLocaleString() : ''}</span>
            </DetailRow>
        </section>
    )
}

type DetailRowProps = {
    children: JSX.Element
    label: string
}

function DetailRow(props: DetailRowProps) {
    return (
        <div class='grid min-w-0 grid-cols-[52px_minmax(0,1fr)] items-center gap-3'>
            <span class='text-xs leading-none text-[#9fb0c7]'>{props.label}</span>
            <div class='min-w-0'>{props.children}</div>
        </div>
    )
}
