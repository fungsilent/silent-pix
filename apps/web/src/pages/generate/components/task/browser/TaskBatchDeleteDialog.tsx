import { createSignal, Show } from 'solid-js'

import { Button } from '#/components/base/Button'
import { Dialog } from '#/components/base/Dialog'
import { FieldHint } from '#/components/base/FieldHint'
import { toErrorMessage } from '#/lib/error'

type TaskBatchDeleteDialogProps = {
    open: boolean
    scope: 'selected' | 'discard'
    selectedCount: number
    pending: boolean
    onOpenChange: (open: boolean) => void
    onConfirm: () => Promise<void>
}

export function TaskBatchDeleteDialog(props: TaskBatchDeleteDialogProps) {
    const [error, setError] = createSignal<string>()
    const isSelected = () => props.scope === 'selected'

    const confirm = async () => {
        if (props.pending) {
            return
        }

        setError()

        try {
            await props.onConfirm()
            props.onOpenChange(false)
        }
        catch (cause) {
            setError(toErrorMessage(cause))
        }
    }

    return (
        <Dialog
            open={props.open}
            title={isSelected() ? 'Delete selected tasks?' : 'Delete all marked tasks?'}
            description={isSelected()
                ? `Permanently delete ${props.selectedCount} selected task${props.selectedCount === 1 ? '' : 's'}. This cannot be undone.`
                : 'Permanently delete every discarded task. Active tasks are skipped and remain selected.'}
            onOpenChange={open => {
                if (!props.pending) {
                    props.onOpenChange(open)
                }
            }}
            classes={{ content: 'w-[420px] max-w-full' }}
            footer={(
                <div class='flex w-full items-center justify-between gap-3'>
                    <Show when={error()}>
                        {message => <FieldHint tone='danger'>{message()}</FieldHint>}
                    </Show>
                    <div class='ml-auto flex shrink-0 gap-2'>
                        <Button
                            disabled={props.pending}
                            classes={{ root: 'min-w-20 text-sm' }}
                            onClick={() => props.onOpenChange(false)}
                        >
                            Cancel
                        </Button>
                        <Button
                            variant='danger'
                            disabled={props.pending}
                            classes={{ root: 'min-w-20 text-sm' }}
                            onClick={() => void confirm()}
                        >
                            {props.pending ? 'Deleting...' : 'Delete'}
                        </Button>
                    </div>
                </div>
            )}
        >
            <p class='m-0 text-xs leading-5 text-fg-secondary'>
                {isSelected()
                    ? 'The selected tasks and their unreferenced images will be removed permanently.'
                    : 'Tasks that are still queued or running are kept so generation can finish.'}
            </p>
        </Dialog>
    )
}
