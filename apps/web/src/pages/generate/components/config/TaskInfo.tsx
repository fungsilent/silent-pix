import { createEffect, createSignal, on, Show } from 'solid-js'

import { Badge } from '#/components/base/Badge'
import { Editable } from '#/components/field/Editable'
import { useRenameTaskMutation } from '#/features/task/task.query'
import { toErrorMessage } from '#/lib/error'
import { TaskDelete } from '#/pages/generate/components/config/TaskDelete'
import { TaskStatus } from '#/pages/generate/components/TaskStatus'
import { useGenerateStore } from '#/pages/generate/store'

import type { GenerateTask } from '#/pages/generate/store'
import type { JSX } from 'solid-js'

type TaskInfoProps = {
    task: GenerateTask
}

export function TaskInfo(props: TaskInfoProps) {
    const store = useGenerateStore()
    const renameMutation = useRenameTaskMutation()
    const [renameError, setRenameError] = createSignal<string>()

    createEffect(on(() => props.task.id, () => setRenameError()))

    const commitName = async (value: string) => {
        const name = value.trim()
        store.setValue('name', name)
        setRenameError()

        if (props.task.status === null || renameMutation.isPending) {
            return
        }

        const currentName = props.task.name ?? ''
        if (name === currentName) {
            return
        }

        try {
            await renameMutation.mutateAsync({
                taskId: props.task.id,
                name: name === '' ? null : name,
            })
        }
        catch (cause) {
            setRenameError(toErrorMessage(cause))
        }
    }

    return (
        <section class='flex flex-col gap-2'>
            <DetailRow label='ID'>
                <span class='block truncate font-mono text-[11px] font-medium leading-none text-fg'>
                    {props.task.id}
                </span>
            </DetailRow>

            <DetailRow label='Name'>
                <div class='flex min-w-0 flex-col gap-1'>
                    <Editable
                        disabled={props.task.status === null || renameMutation.isPending}
                        label='Name'
                        value={store.state.values.name}
                        onChange={value => {
                            setRenameError()
                            store.setValue('name', value)
                        }}
                        onCommit={value => void commitName(value)}
                        classes={{
                            root: 'w-full',
                        }}
                    />
                    <Show when={props.task.status === null}>
                        <p class='m-0 text-xs text-fg-muted'>Name is set after the task exists.</p>
                    </Show>
                    <Show when={renameError()}>
                        {message => (
                            <p class='m-0 truncate text-xs text-danger-fg'>{message()}</p>
                        )}
                    </Show>
                </div>
            </DetailRow>

            <DetailRow label='Status'>
                {/* draft 是前端狀態，後端的 TaskStatus union 沒有它，所以不走 TaskStatus */}
                {props.task.status
                    ? <TaskStatus status={props.task.status} />
                    : <Badge>Draft</Badge>}
            </DetailRow>

            <DetailRow label='Created'>
                <span
                    class='text-xs leading-none'
                    classList={{
                        'text-fg-secondary': props.task.createdAt !== null,
                        'text-fg-muted': props.task.createdAt === null,
                    }}
                >
                    {props.task.createdAt ? new Date(props.task.createdAt).toLocaleString() : '-'}
                </span>
            </DetailRow>

            <Show when={props.task.status !== null}>
                <TaskDelete task={props.task} />
            </Show>
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
