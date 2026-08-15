import { Trash2 } from 'lucide-solid'
import { createSignal, Show } from 'solid-js'

import { Button } from '#/components/base/Button'
import { Dialog } from '#/components/base/Dialog'
import { useDeleteTaskMutation } from '#/features/task/task.query'
import { toErrorMessage } from '#/lib/error'

import type { GenerateTask } from '#/pages/generate/store'

type TaskDeleteProps = {
    task: GenerateTask
}

export function TaskDelete(props: TaskDeleteProps) {
    const mutation = useDeleteTaskMutation()
    const [open, setOpen] = createSignal(false)
    const [error, setError] = createSignal<string>()

    const isSaved = () => props.task.status !== null

    const imageCount = () => props.task.images.length

    const openDialog = () => {
        setError()
        setOpen(true)
    }

    const confirm = async () => {
        setError()

        try {
            await mutation.mutateAsync({ taskId: props.task.id })
            setOpen(false)
        }
        catch (cause) {
            setError(toErrorMessage(cause))
        }
    }

    return (
        <Show when={isSaved()}>
            <Button
                aria-label='Delete task'
                classes={{ root: 'w-full text-red-300 hover:bg-red-500/12 hover:text-red-200' }}
                onClick={openDialog}
            >
                <Trash2
                    size={13}
                    strokeWidth={1.8}
                    aria-hidden='true'
                />
                Delete task
            </Button>

            <Dialog
                open={open()}
                title='Delete this task?'
                description={imageCount() > 0
                    ? `The task and its ${imageCount()} image${imageCount() > 1 ? 's' : ''} are removed from disk. This cannot be undone.`
                    : 'The task is removed from disk. This cannot be undone.'}
                onOpenChange={setOpen}
                classes={{ content: 'w-[420px] max-w-full' }}
                footer={(
                    <div class='flex w-full items-center justify-between gap-3'>
                        <Show when={error()}>
                            {message => (
                                <p class='m-0 min-w-0 truncate text-xs text-red-300'>{message()}</p>
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
                                classes={{ root: 'min-w-20 bg-red-500/15 text-red-300 hover:bg-red-500/25 text-sm' }}
                                disabled={mutation.isPending}
                                onClick={() => void confirm()}
                            >
                                {mutation.isPending ? 'Deleting...' : 'Delete'}
                            </Button>
                        </div>
                    </div>
                )}
            >
                <p class='m-0 truncate font-mono text-xs text-fg-secondary'>
                    {props.task.name ?? props.task.id}
                </p>
            </Dialog>
        </Show>
    )
}
