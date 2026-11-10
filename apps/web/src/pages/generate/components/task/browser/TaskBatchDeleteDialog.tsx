import { createSignal, Show } from 'solid-js'

import { Button } from '#/components/base/Button'
import { Dialog } from '#/components/base/Dialog'
import { FieldHint } from '#/components/base/FieldHint'
import { toErrorMessage } from '#/lib/error'
import { t } from '#/lib/i18n'

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
            title={isSelected() ? t('task.deleteSelectedTitle') : t('task.deleteMarkedTitle')}
            description={isSelected()
                ? t('task.deleteSelectedDescription', { count: props.selectedCount })
                : t('task.deleteDiscardedDescription')}
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
                            {t('common.cancel')}
                        </Button>
                        <Button
                            tone='danger'
                            disabled={props.pending}
                            classes={{ root: 'min-w-20 text-sm' }}
                            onClick={() => void confirm()}
                        >
                            {props.pending ? t('common.deleting') : t('common.delete')}
                        </Button>
                    </div>
                </div>
            )}
        >
            <p class='m-0 text-xs leading-5 text-fg-secondary'>
                {isSelected()
                    ? t('task.deleteSelectedHint')
                    : t('task.deleteDiscardedHint')}
            </p>
        </Dialog>
    )
}
