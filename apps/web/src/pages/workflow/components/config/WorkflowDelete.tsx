import { Trash2 } from 'lucide-solid'
import { createSignal, Show } from 'solid-js'

import { Button } from '#/components/base/Button'
import { Dialog } from '#/components/base/Dialog'
import { FieldHint } from '#/components/base/FieldHint'
import { useDeleteWorkflowMutation } from '#/features/workflow/workflow.query'
import { toErrorMessage } from '#/lib/error'
import { t } from '#/lib/i18n'
import { useWorkflowStore } from '#/pages/workflow/store'

export function WorkflowDelete() {
    const store = useWorkflowStore()
    const mutation = useDeleteWorkflowMutation()
    const [open, setOpen] = createSignal(false)
    const [error, setError] = createSignal<() => string>()

    const selection = () => store.selection()
    const taskCount = () => selection().taskCount
    const isArchived = () => selection().isArchived

    const willArchive = () => !isArchived() && taskCount() > 0
    const describe = () => {
        if (willArchive()) {
            return t('workflow.archive.description', { count: taskCount() })
        }

        if (isArchived() && taskCount() > 0) {
            return t('workflow.archive.alreadyArchived', { count: taskCount() })
        }

        return t('workflow.delete.description')
    }

    const openDialog = () => {
        setError()
        setOpen(true)
    }

    const confirm = async () => {
        const workflowId = selection().id

        if (!workflowId || selection().isNew) {
            return
        }

        setError()

        try {
            const result = await mutation.mutateAsync({ workflowId })
            setOpen(false)

            if (result.disposition === 'deleted') {
                store.applyRemoved(workflowId)
            }
        }
        catch (cause) {
            setError(() => () => toErrorMessage(cause))
        }
    }

    return (
        <>
            <Button
                tone='danger'
                disabled={mutation.isPending}
                classes={{ root: 'w-full disabled:cursor-not-allowed disabled:opacity-60' }}
                onClick={openDialog}
            >
                <Trash2
                    size={13}
                    strokeWidth={1.8}
                />
                {willArchive() ? t('workflow.archive.action') : t('workflow.delete.action')}
            </Button>

            <Dialog
                open={open()}
                title={willArchive() ? t('workflow.archive.title') : t('workflow.delete.title')}
                description={describe()}
                onOpenChange={setOpen}
                classes={{ content: 'w-[420px] max-w-full' }}
                footer={(
                    <div class='flex w-full items-center justify-between gap-3'>
                        <Show when={error()}>
                            {message => (
                                <FieldHint tone='danger'>{message()()}</FieldHint>
                            )}
                        </Show>
                        <div class='ml-auto flex shrink-0 gap-2'>
                            <Button
                                classes={{ root: 'min-w-20 text-sm' }}
                                disabled={mutation.isPending}
                                onClick={() => setOpen(false)}
                            >
                                {t('common.cancel')}
                            </Button>
                            <Button
                                tone='danger'
                                classes={{ root: 'min-w-20 text-sm' }}
                                disabled={mutation.isPending}
                                onClick={() => void confirm()}
                            >
                                {mutation.isPending
                                    ? (willArchive() ? t('workflow.archive.pending') : t('common.deleting'))
                                    : (willArchive() ? t('workflow.archive.confirm') : t('common.delete'))}
                            </Button>
                        </div>
                    </div>
                )}
            >
                <p class='m-0 truncate font-mono text-xs text-fg-secondary'>
                    {selection().name || t('common.untitled')}
                </p>
            </Dialog>
        </>
    )
}
