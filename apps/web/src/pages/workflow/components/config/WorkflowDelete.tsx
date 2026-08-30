import { Trash2 } from 'lucide-solid'
import { createSignal, Show } from 'solid-js'

import { Button } from '#/components/base/Button'
import { Dialog } from '#/components/base/Dialog'
import { FieldHint } from '#/components/base/FieldHint'
import { useDeleteWorkflowMutation } from '#/features/workflow/workflow.query'
import { toErrorMessage } from '#/lib/error'
import { useWorkflowStore } from '#/pages/workflow/store'

export function WorkflowDelete() {
    const store = useWorkflowStore()
    const mutation = useDeleteWorkflowMutation()
    const [open, setOpen] = createSignal(false)
    const [error, setError] = createSignal<string>()

    const selection = () => store.selection()
    const taskCount = () => selection().taskCount
    /*
     * 有 task 引用就只能封存。已經封存又還有引用的那筆沒有下一步可走——
     * 等 task 被刪光，taskCount 歸零，同一顆按鈕才會變成真刪。
     */
    const isArchiveOnly = () => taskCount() > 0
    const isExhausted = () => selection().isArchived && isArchiveOnly()

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
            setError(toErrorMessage(cause))
        }
    }

    return (
        <>
            <Button
                variant='danger'
                aria-label='Delete workflow'
                disabled={isExhausted() || mutation.isPending}
                classes={{ root: 'w-full disabled:cursor-not-allowed disabled:opacity-60' }}
                onClick={openDialog}
            >
                <Trash2
                    size={13}
                    strokeWidth={1.8}
                    aria-hidden='true'
                />
                {isArchiveOnly() ? 'Archive workflow' : 'Delete workflow'}
            </Button>

            <Dialog
                open={open()}
                title={isArchiveOnly() ? 'Archive this workflow?' : 'Delete this workflow?'}
                description={isArchiveOnly()
                    ? `${taskCount()} task${taskCount() > 1 ? 's' : ''} still use this workflow, so it is archived instead of deleted. It leaves the generate picker and those tasks keep working.`
                    : 'No task uses this workflow. It is removed from the database. This cannot be undone.'}
                onOpenChange={setOpen}
                classes={{ content: 'w-[420px] max-w-full' }}
                footer={(
                    <div class='flex w-full items-center justify-between gap-3'>
                        <Show when={error()}>
                            {message => (
                                <FieldHint tone='danger'>{message()}</FieldHint>
                            )}
                        </Show>
                        <div class='ml-auto flex shrink-0 gap-2'>
                            <Button
                                classes={{ root: 'min-w-20 text-sm' }}
                                disabled={mutation.isPending}
                                onClick={() => setOpen(false)}
                            >
                                Cancel
                            </Button>
                            <Button
                                variant='danger'
                                classes={{ root: 'min-w-20 text-sm' }}
                                disabled={mutation.isPending}
                                onClick={() => void confirm()}
                            >
                                {mutation.isPending
                                    ? (isArchiveOnly() ? 'Archiving...' : 'Deleting...')
                                    : (isArchiveOnly() ? 'Archive' : 'Delete')}
                            </Button>
                        </div>
                    </div>
                )}
            >
                <p class='m-0 truncate font-mono text-xs text-fg-secondary'>
                    {selection().name || 'Untitled'}
                </p>
            </Dialog>
        </>
    )
}
