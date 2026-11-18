import { createSignal } from 'solid-js'

import { Button } from '#/components/base/Button'
import { Dialog } from '#/components/base/Dialog'
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
    const [error, setError] = createSignal<() => string>()
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
            setError(() => () => toErrorMessage(cause))
        }
    }

    return (
        <Dialog
            open={props.open}
            title={isSelected() ? t('task.deleteSelectedTitle') : t('task.deleteMarkedTitle')}
            description={isSelected()
                ? t('task.deleteSelectedDescription', { count: props.selectedCount })
                : t('task.deleteDiscardedDescription')}
            closeDisabled={props.pending}
            onOpenChange={props.onOpenChange}
            classes={{ content: 'w-[420px] max-w-full' }}
            error={error()?.()}
            footer={(
                <>
                    <Button
                        disabled={props.pending}
                        size='dialog'
                        onClick={() => props.onOpenChange(false)}
                    >
                        {t('common.cancel')}
                    </Button>
                    <Button
                        tone='danger'
                        disabled={props.pending}
                        size='dialog'
                        onClick={() => void confirm()}
                    >
                        {props.pending ? t('common.deleting') : t('common.delete')}
                    </Button>
                </>
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
