import { Check, Copy, Trash2 } from 'lucide-solid'
import { createSignal, onCleanup, Show } from 'solid-js'

import { Badge } from '#/components/base/Badge'
import { Button } from '#/components/base/Button'
import { Dialog } from '#/components/base/Dialog'
import { Loading } from '#/components/base/Loading'
import { DetailRow, DetailSection } from '#/components/detail'
import { Editable } from '#/components/field/Editable'
import { TaskFailure } from '#/components/task/detail/TaskFailure'
import { TaskStatus } from '#/components/task/TaskStatus'
import { toErrorMessage } from '#/lib/error'
import { formatDate, formatTime } from '#/lib/format'
import { t } from '#/lib/i18n'
import { useIssueSource } from '#/lib/issue'

import type { TaskApi } from '@silent-pix/shared'
import type { Accessor } from 'solid-js'

export type TaskInfoData = {
    id: Accessor<string | undefined>
    name: Accessor<string>
    status: Accessor<TaskApi.TaskStatus | undefined>
    errorCode: Accessor<string | null | undefined>
    errorMessage: Accessor<string | null | undefined>
    createdAt: Accessor<string | undefined>
}

export type TaskInfoCreateData = TaskInfoData & {
    draft: Accessor<boolean>
    imageCount: Accessor<number>
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
    const [idCopied, setIdCopied] = createSignal(false)
    const [copyFailed, setCopyFailed] = createSignal(false)
    let copiedTimer: number | undefined
    onCleanup(() => window.clearTimeout(copiedTimer))
    useIssueSource(() => copyFailed()
        ? [{ id: 'task-id-copy', tone: 'warning' as const, field: () => t('fields.id'), message: () => t('common.copyFailed'), onDismiss: () => setCopyFailed(false) }]
        : [])
    const copyId = async (id: string) => {
        try {
            await navigator.clipboard.writeText(id)
            setCopyFailed(false)
            setIdCopied(true)
            window.clearTimeout(copiedTimer)
            copiedTimer = window.setTimeout(() => setIdCopied(false), 1500)
        }
        catch {
            setCopyFailed(true)
        }
    }
    const [deleteError, setDeleteError] = createSignal<() => string>()
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
            setDeleteError(() => () => toErrorMessage(cause))
        }
    }

    return (
        <DetailSection inert={props.loading()}>
            <DetailRow label={t('fields.id')}>
                <Loading.Mask loading={props.loading}>
                    <Show
                        when={props.data.id()}
                        /* cold／draft 時用 nbsp 撐住行高，mask 才有高度；不是假資料 */
                        fallback={<span class='block font-mono text-[11px] leading-none'>{'\u00A0'}</span>}
                    >
                        {id => (
                            <button
                                type='button'
                                title={t('common.copyId')}
                                class='group flex min-w-0 max-w-full cursor-pointer items-center gap-1.5 border-0 bg-transparent p-0 text-left outline-none'
                                onClick={() => void copyId(id())}
                            >
                                <span class='min-w-0 truncate font-mono text-[11px] font-medium leading-none text-fg'>
                                    {id()}
                                </span>
                                <span
                                    class='flex shrink-0 text-fg-muted'
                                    classList={{ 'opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100': !idCopied() }}
                                >
                                    <Show
                                        when={idCopied()}
                                        fallback={(
                                            <Copy
                                                size={12}
                                                strokeWidth={1.8}
                                            />
                                        )}
                                    >
                                        <Check
                                            size={12}
                                            strokeWidth={2}
                                        />
                                    </Show>
                                </span>
                            </button>
                        )}
                    </Show>
                </Loading.Mask>
            </DetailRow>

            <DetailRow label={t('fields.name')}>
                <div class='flex min-w-0 flex-col gap-1'>
                    <Loading.Mask loading={props.loading}>
                        <Editable
                            disabled={props.mode === 'view'
                                || isDraft()
                                || props.loading()
                                || props.data.status() === undefined
                                || renamePending()}
                            label={t('fields.name')}
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
                </div>
            </DetailRow>

            <DetailRow label={t('fields.status')}>
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
                        <Badge tone='neutral'>{t('task.draft')}</Badge>
                    </Show>
                </Loading.Mask>
            </DetailRow>

            <Show
                when={!props.loading() && !isDraft() && props.data.status() === 'failed' && props.data.id()}
                keyed
            >
                <TaskFailure
                    errorCode={props.data.errorCode() ?? null}
                    errorMessage={props.data.errorMessage() ?? null}
                />
            </Show>

            <DetailRow label={t('fields.created')}>
                <Loading.Mask loading={props.loading}>
                    <span
                        class='flex gap-1.5 text-xs leading-none tabular-nums'
                        classList={{
                            'text-fg-secondary': props.data.createdAt() != null,
                            'text-fg-muted': props.data.createdAt() == null,
                        }}
                    >
                        <Show
                            when={props.data.createdAt()}
                            fallback='-'
                        >
                            {createdAt => (
                                <>
                                    <span>{formatDate(createdAt())}</span>
                                    <span>{formatTime(createdAt())}</span>
                                </>
                            )}
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
                        {t('task.deleteAction')}
                    </Button>
                </Loading.Mask>
            </Show>

            <Show when={isCreate()}>
                <Dialog
                    open={deleteOpen()}
                    title={t('task.deleteTitle')}
                    description={imageCount() > 0
                        ? t('task.deleteWithImages', { count: imageCount() })
                        : t('task.deleteWithoutImages')}
                    onOpenChange={setDeleteOpen}
                    classes={{ content: 'w-[420px] max-w-full' }}
                    error={deleteError()?.()}
                    footer={(
                        <>
                            <Button
                                size='dialog'
                                disabled={deletePending()}
                                onClick={() => setDeleteOpen(false)}
                            >
                                {t('common.cancel')}
                            </Button>
                            <Button
                                tone='danger'
                                size='dialog'
                                disabled={deletePending()}
                                onClick={() => void confirmDelete()}
                            >
                                {deletePending() ? t('common.deleting') : t('common.delete')}
                            </Button>
                        </>
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
