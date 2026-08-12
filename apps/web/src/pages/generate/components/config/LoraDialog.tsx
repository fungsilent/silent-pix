import { clsx } from 'clsx'
import { Check, RefreshCw } from 'lucide-solid'
import { createEffect, createMemo, createSignal, For, Show } from 'solid-js'

import { Button } from '#/components/base/Button'
import { Dialog } from '#/components/base/Dialog'
import { useLoraListQuery } from '#/features/task/task.query'
import { useGenerateStore } from '#/pages/generate/store'

type LoraDialogProps = {
    open: boolean
    onOpenChange: (open: boolean) => void
}

export function LoraDialog(props: LoraDialogProps) {
    const store = useGenerateStore()
    const query = useLoraListQuery(() => props.open)
    const [selectedName, setSelectedName] = createSignal<string>()
    const addedNames = createMemo(() => new Set(
        store.state.values.lora.map(lora => lora.name),
    ))
    const options = () => query.data?.options ?? []
    const canAdd = () => {
        const name = selectedName()
        return Boolean(name && !addedNames().has(name))
    }

    createEffect(() => {
        if (!props.open) {
            setSelectedName()
        }
    })

    const addSelectedLora = () => {
        const name = selectedName()
        if (!name || addedNames().has(name)) return

        if (store.addLora(name)) {
            props.onOpenChange(false)
        }
    }

    return (
        <Dialog
            open={props.open}
            title='Add LoRA'
            onOpenChange={props.onOpenChange}
            footer={(
                <>
                    <Button
                        type='button'
                        classes={{ root: 'min-w-20 px-3 py-1.5 text-sm' }}
                        onClick={() => props.onOpenChange(false)}
                    >
                        Cancel
                    </Button>
                    <Button
                        type='button'
                        disabled={!canAdd()}
                        classes={{ root: 'min-w-20 border-accent/70 bg-accent/15 px-3 py-1.5 text-sm text-accent-fg' }}
                        onClick={addSelectedLora}
                    >
                        Add
                    </Button>
                </>
            )}
        >
            <div class='flex min-h-32 flex-col gap-3'>
                <Show when={query.isLoading}>
                    <p class='m-0 py-8 text-center text-sm text-fg-muted'>Loading LoRAs...</p>
                </Show>

                <Show when={query.isError}>
                    <div class='flex flex-col items-center gap-3 py-8 text-center'>
                        <p class='m-0 text-sm text-red-300'>Failed to load LoRAs.</p>
                        <Button
                            type='button'
                            classes={{ root: 'px-3 py-1.5 text-sm' }}
                            onClick={() => void query.refetch()}
                        >
                            <RefreshCw
                                size={14}
                                strokeWidth={2}
                                aria-hidden='true'
                            />
                            Retry
                        </Button>
                    </div>
                </Show>

                <Show when={!query.isLoading && !query.isError}>
                    <Show
                        when={options().length > 0}
                        fallback={(
                            <p class='m-0 py-8 text-center text-sm text-fg-muted'>
                                No LoRAs available in ComfyUI.
                            </p>
                        )}
                    >
                        <div
                            class='flex flex-col gap-1'
                            role='radiogroup'
                            aria-label='Available LoRAs'
                        >
                            <For each={options()}>
                                {option => {
                                    const isAdded = () => addedNames().has(option.value)
                                    const isSelected = () => selectedName() === option.value

                                    return (
                                        <button
                                            type='button'
                                            role='radio'
                                            aria-checked={isSelected()}
                                            disabled={isAdded()}
                                            title={option.value}
                                            class={clsx(
                                                'flex min-h-10 w-full items-center justify-between gap-3 rounded-md border px-3 py-2 text-left text-sm outline-none transition-colors',
                                                isSelected()
                                                    ? 'border-accent bg-accent/15 text-fg'
                                                    : 'border-line bg-elevated text-fg-secondary',
                                                isAdded()
                                                    ? 'cursor-not-allowed opacity-60'
                                                    : 'cursor-pointer hover:bg-hover focus:border-accent',
                                            )}
                                            onClick={() => {
                                                if (!isAdded()) setSelectedName(option.value)
                                            }}
                                        >
                                            <span class='min-w-0 break-all'>{option.label}</span>
                                            <Show
                                                when={isAdded()}
                                                fallback={(
                                                    <Show when={isSelected()}>
                                                        <Check
                                                            class='shrink-0 text-accent-fg'
                                                            size={15}
                                                            strokeWidth={2}
                                                            aria-hidden='true'
                                                        />
                                                    </Show>
                                                )}
                                            >
                                                <span class='shrink-0 text-xs text-fg-muted'>Added</span>
                                            </Show>
                                        </button>
                                    )
                                }}
                            </For>
                        </div>
                    </Show>
                </Show>
            </div>
        </Dialog>
    )
}
