import { createEffect, createSignal, on, Show } from 'solid-js'

import { Badge } from '#/components/base/Badge'
import { FieldHint } from '#/components/base/FieldHint'
import { Loading } from '#/components/base/Loading'
import { DetailRow, DetailSection } from '#/components/detail'
import { Editable } from '#/components/field/Editable'
import { useRenameTaskMutation } from '#/features/task/task.query'
import { toErrorMessage } from '#/lib/error'
import { formatDateTime } from '#/lib/format'
import { TaskDelete } from '#/pages/generate/components/config/TaskDelete'
import { TaskStatus } from '#/pages/generate/components/TaskStatus'
import { useGenerateDetail } from '#/pages/generate/detail'
import { useGenerateStore } from '#/pages/generate/store'

import type { TaskDetailMode } from '#/pages/generate/components/config/TaskDetailMode'

type TaskInfoProps = {
    mode: TaskDetailMode
}

export function TaskInfo(props: TaskInfoProps) {
    const form = useGenerateStore().form
    const detail = useGenerateDetail()
    const task = detail.task
    const isLoading = detail.loading
    const renameMutation = useRenameTaskMutation()
    const [renameError, setRenameError] = createSignal<string>()
    const hasDelete = () => props.mode !== 'view'
        && (isLoading() || task()?.status != null)

    createEffect(on(() => task()?.id, () => setRenameError()))

    return (
        <DetailSection inert={isLoading()}>
            <DetailRow label='ID'>
                <Loading.Mask loading={isLoading}>
                    {/* cold 時用 nbsp 撐住行高，mask 才有高度；不是假資料 */}
                    <span class='block truncate font-mono text-[11px] font-medium leading-none text-fg'>
                        {task()?.id ?? '\u00A0'}
                    </span>
                </Loading.Mask>
            </DetailRow>

            <DetailRow label='Name'>
                <div class='flex min-w-0 flex-col gap-1'>
                    <form.Field name='name'>
                        {field => {
                            const commitName = async (value: string) => {
                                const name = value.trim()
                                field().handleChange(name)
                                setRenameError()

                                const current = task()

                                if (!current || props.mode === 'view' || current.status === null || renameMutation.isPending) {
                                    return
                                }

                                const currentName = current.name ?? ''
                                if (name === currentName) {
                                    return
                                }

                                try {
                                    await renameMutation.mutateAsync({
                                        taskId: current.id,
                                        name: name === '' ? null : name,
                                    })
                                }
                                catch (cause) {
                                    setRenameError(toErrorMessage(cause))
                                }
                            }

                            return (
                                <Loading.Mask loading={isLoading}>
                                    <Editable
                                        disabled={props.mode === 'view' || task()?.status == null || renameMutation.isPending}
                                        label='Name'
                                        value={field().state.value}
                                        onChange={value => {
                                            setRenameError()
                                            field().handleChange(value)
                                        }}
                                        onCommit={value => void commitName(value)}
                                        classes={{
                                            root: 'w-full',
                                        }}
                                    />
                                </Loading.Mask>
                            )
                        }}
                    </form.Field>
                    <Show when={renameError()}>
                        {message => (
                            <FieldHint tone='danger'>{message()}</FieldHint>
                        )}
                    </Show>
                </div>
            </DetailRow>

            <DetailRow label='Status'>
                <Loading.Mask loading={isLoading}>
                    <Show
                        when={task()}
                        /* cold 時只留 Badge 的 h-5 外框，不冒充 Draft */
                        fallback={<Badge>{'\u00A0'}</Badge>}
                    >
                        {current => (
                            <Show
                                when={current().status}
                                fallback={<Badge>Draft</Badge>}
                            >
                                {status => <TaskStatus status={status()} />}
                            </Show>
                        )}
                    </Show>
                </Loading.Mask>
            </DetailRow>

            <DetailRow label='Created'>
                <Loading.Mask loading={isLoading}>
                    <span
                        class='block text-xs leading-none'
                        classList={{
                            'text-fg-secondary': task()?.createdAt != null,
                            'text-fg-muted': task()?.createdAt == null,
                        }}
                    >
                        <Show
                            when={task()?.createdAt}
                            fallback='-'
                        >
                            {createdAt => formatDateTime(createdAt())}
                        </Show>
                    </span>
                </Loading.Mask>
            </DetailRow>

            <Show when={hasDelete()}>
                <Loading.Mask loading={isLoading}>
                    <TaskDelete task={task()} />
                </Loading.Mask>
            </Show>
        </DetailSection>
    )
}
