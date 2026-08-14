import { Editable } from '#/components/field/Editable'
import { TaskStatus } from '#/pages/generate/components/TaskStatus'
import { useGenerateStore } from '#/pages/generate/store'

import type { GenerateTask } from '#/pages/generate/store'
import type { JSX } from 'solid-js'

type TaskInfoProps = {
    task: GenerateTask
}

export function TaskInfo(props: TaskInfoProps) {
    const store = useGenerateStore()

    return (
        <section class='flex flex-col gap-2'>
            <DetailRow label='ID'>
                <span class='block truncate font-mono text-[11px] font-medium leading-none text-fg'>
                    {props.task.id}
                </span>
            </DetailRow>

            <DetailRow label='Name'>
                <Editable
                    label='Name'
                    value={store.state.values.name}
                    onChange={value => store.setValue('name', value)}
                    onCommit={value => store.setValue('name', value)}
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
                <span class='text-xs leading-none text-fg-secondary'>
                    {props.task.createdAt ? new Date(props.task.createdAt).toLocaleString() : ''}
                </span>
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
        <div class='grid min-w-0 grid-cols-[74px_minmax(0,1fr)] items-center gap-3'>
            <span class='text-xs leading-none text-fg-muted'>{props.label}</span>
            <div class='min-w-0'>{props.children}</div>
        </div>
    )
}
