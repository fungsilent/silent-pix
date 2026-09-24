import { Trash2 } from 'lucide-solid'
import { createSignal, Show } from 'solid-js'

import { Badge } from '#/components/base/Badge'
import { Button } from '#/components/base/Button'
import { Dialog } from '#/components/base/Dialog'
import { FieldHint } from '#/components/base/FieldHint'
import { Loading } from '#/components/base/Loading'
import { DetailRow, DetailSection } from '#/components/detail'
import { Editable } from '#/components/field/Editable'
import { TaskStatus } from '#/components/task/TaskStatus'
import { toErrorMessage } from '#/lib/error'
import { formatDateTime } from '#/lib/format'

import type { TaskApi } from '@silent-pix/shared'
import type { Accessor } from 'solid-js'

export type TaskInfoData = {
    id: Accessor<string | undefined>
    name: Accessor<string>
    status: Accessor<TaskApi.TaskStatus | undefined>
    createdAt: Accessor<string | undefined>
}

export type TaskInfoCreateData = TaskInfoData & {
    draft: Accessor<boolean>
    imageCount: Accessor<number>
    renameError: Accessor<string | undefined>
    renamePending: Accessor<boolean>
    deletePending: Accessor<boolean>
}

export type TaskInfoActions = {
    onNameChange: (value: string) => void
    onNameCommit: (value: string) => void
    onDeleteTask: () => Promise<void>
}

type TaskInfoProps = {
    mode: 'create'
    data: TaskInfoCreateData
    actions: TaskInfoActions
    loading: Accessor<boolean>
} | {
    mode: 'view'
    data: TaskInfoData
    loading: Accessor<boolean>
}

export function TaskInfo(props: TaskInfoProps) {
    const [deleteOpen, setDeleteOpen] = createSignal(false)
    const [deleteError, setDeleteError] = createSignal<string>()
    const isCreate = () => props.mode === 'create'
    const isDraft = () => {
        if (props.mode !== 'create') {
            return false
        }

        return props.data.draft()
    }
    const hasDelete = () => isCreate()
        && !isDraft()
        && !props.loading()
        && props.data.status() !== undefined
    const renamePending = () => props.mode === 'create' ? props.data.renamePending() : false
    const renameError = () => props.mode === 'create' ? props.data.renameError() : undefined
    const deletePending = () => props.mode === 'create' ? props.data.deletePending() : false
    const imageCount = () => props.mode === 'create' ? props.data.imageCount() : 0

    const commitName = (value: string) => {
        if (props.mode !== 'create') {
            return
        }

        const name = value.trim()
        props.actions.onNameChange(name)
        props.actions.onNameCommit(name)
    }

    const openDelete = () => {
        if (!hasDelete()) {
            return
        }

        setDeleteError()
        setDeleteOpen(true)
    }

    const confirmDelete = async () => {
        if (props.mode !== 'create') {
            return
        }

        setDeleteError()

        try {
            await props.actions.onDeleteTask()
            setDeleteOpen(false)
        }
        catch (cause) {
            setDeleteError(toErrorMessage(cause))
        }
    }

    return (
        <DetailSection inert={props.loading()}>
            <DetailRow label='ID'>
                <Loading.Mask loading={props.loading}>
                    {/* cold 時用 nbsp 撐住行高，mask 才有高度；不是假資料 */}
                    <span class='block truncate font-mono text-[11px] font-medium leading-none text-fg'>
                        {props.data.id() ?? '\u00A0'}
                    </span>
                </Loading.Mask>
            </DetailRow>

            <DetailRow label='Name'>
                <div class='flex min-w-0 flex-col gap-1'>
                    <Loading.Mask loading={props.loading}>
                        <Editable
                            disabled={props.mode === 'view'
                                || isDraft()
                                || props.loading()
                                || props.data.status() === undefined
                                || renamePending()}
                            label='Name'
                            value={props.data.name()}
                            onChange={value => {
                                if (props.mode === 'create') {
                                    props.actions.onNameChange(value)
                                }
                            }}
                            onCommit={value => void commitName(value)}
                            classes={props.mode === 'view'
                                ? { root: 'w-full', trigger: 'hidden' }
                                : { root: 'w-full' }}
                        />
                    </Loading.Mask>
                    <Show when={isCreate() && renameError()}>
                        <FieldHint tone='danger'>{renameError()}</FieldHint>
                    </Show>
                </div>
            </DetailRow>

            <DetailRow label='Status'>
                <Loading.Mask loading={props.loading}>
                    <Show
                        when={isDraft()}
                        fallback={(
                            <Show
                                when={props.data.status()}
                                /* cold 時只留 Badge 的 h-5 外框，不冒充 Draft */
                                fallback={<Badge>{'\u00A0'}</Badge>}
                            >
                                {status => <TaskStatus status={status()} />}
                            </Show>
                        )}
                    >
                        <Badge tone='neutral'>Draft</Badge>
                    </Show>
                </Loading.Mask>
            </DetailRow>

            <DetailRow label='Created'>
                <Loading.Mask loading={props.loading}>
                    <span
                        class='block text-xs leading-none'
                        classList={{
                            'text-fg-secondary': props.data.createdAt() != null,
                            'text-fg-muted': props.data.createdAt() == null,
                        }}
                    >
                        <Show
                            when={props.data.createdAt()}
                            fallback='-'
                        >
                            {createdAt => formatDateTime(createdAt())}
                        </Show>
                    </span>
                </Loading.Mask>
            </DetailRow>

            <Show when={hasDelete()}>
                <Loading.Mask loading={props.loading}>
                    <Button
                        tone='danger'
                        classes={{ root: 'w-full' }}
                        onClick={openDelete}
                    >
                        <Trash2
                            size={13}
                            strokeWidth={1.8}
                        />
                        Delete task
                    </Button>
                </Loading.Mask>
            </Show>

            <Show when={isCreate()}>
                <Dialog
                    open={deleteOpen()}
                    title='Delete this task?'
                    description={imageCount() > 0
                        ? `The task and its ${imageCount()} image${imageCount() > 1 ? 's' : ''} are removed from disk. This cannot be undone.`
                        : 'The task is removed from disk. This cannot be undone.'}
                    onOpenChange={setDeleteOpen}
                    classes={{ content: 'w-[420px] max-w-full' }}
                    footer={(
                        <div class='flex w-full items-center justify-between gap-3'>
                            <Show when={deleteError()}>
                                {message => <FieldHint tone='danger'>{message()}</FieldHint>}
                            </Show>
                            <div class='ml-auto flex shrink-0 gap-2'>
                                <Button
                                    classes={{ root: 'min-w-20 text-sm' }}
                                    disabled={deletePending()}
                                    onClick={() => setDeleteOpen(false)}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    tone='danger'
                                    classes={{ root: 'min-w-20 text-sm' }}
                                    disabled={deletePending()}
                                    onClick={() => void confirmDelete()}
                                >
                                    {deletePending() ? 'Deleting...' : 'Delete'}
                                </Button>
                            </div>
                        </div>
                    )}
                >
                    <p class='m-0 truncate font-mono text-xs text-fg-secondary'>
                        {props.data.name() || props.data.id()}
                    </p>
                </Dialog>
            </Show>
        </DetailSection>
    )
}
