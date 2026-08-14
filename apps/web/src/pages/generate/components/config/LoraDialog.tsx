import { Check, Plus, RefreshCw, Search } from 'lucide-solid'
import { createEffect, createSignal, For, Show } from 'solid-js'

import { Button } from '#/components/base/Button'
import { Dialog } from '#/components/base/Dialog'
import { Text } from '#/components/field'
import { useLoraListQuery } from '#/features/task/task.query'
import { cn } from '#/lib/cn'
import { useGenerateStore } from '#/pages/generate/store'

type LoraDialogProps = {
    open: boolean
    onOpenChange: (open: boolean) => void
}

export function LoraDialog(props: LoraDialogProps) {
    const store = useGenerateStore()
    const query = useLoraListQuery(() => props.open)
    const [selected, setSelected] = createSignal<string[]>([])
    const [keyword, setKeyword] = createSignal('')

    createEffect(() => {
        if (!props.open) {
            return
        }

        setSelected(store.state.values.lora.map(lora => lora.name))
        setKeyword('')
    })

    const options = () => query.data?.options ?? []
    const visibleOptions = () => {
        const text = keyword().trim().toLowerCase()
        if (!text) {
            return options()
        }

        return options().filter(option => option.label.toLowerCase().includes(text))
    }

    const isSelected = (name: string) => selected().includes(name)
    const toggle = (name: string) => {
        setSelected(current => (
            current.includes(name)
                ? current.filter(item => item !== name)
                : [...current, name]
        ))
    }

    const apply = () => {
        store.setLoraNames(selected())
        props.onOpenChange(false)
    }

    return (
        <Dialog
            open={props.open}
            title='Select LoRA'
            onOpenChange={props.onOpenChange}
            classes={{
                backdrop: 'bg-black/55 backdrop-blur-[2px]',
                body: 'flex min-h-0 flex-col overflow-hidden',
                content: 'w-[600px] max-w-full rounded-[10px] max-h-[70vh]',
            }}
            footer={(
                <div class='flex w-full items-center justify-between gap-3'>
                    <span class='text-xs text-fg-muted tabular-nums'>
                        {selected().length} selected
                    </span>
                    <div class='flex gap-2'>
                        <Button
                            type='button'
                            classes={{ root: 'min-w-20 text-sm' }}
                            onClick={() => props.onOpenChange(false)}
                        >
                            Cancel
                        </Button>
                        <Button
                            type='button'
                            variant='accent'
                            classes={{ root: 'min-w-20 text-sm' }}
                            onClick={apply}
                        >
                            Apply
                        </Button>
                    </div>
                </div>
            )}
        >
            <Text
                label='Search LoRA'
                value={keyword()}
                placeholder='Search LoRA...'
                icon={(
                    <Search
                        size={14}
                        strokeWidth={1.8}
                    />
                )}
                classes={{ root: 'shrink-0', label: 'sr-only' }}
                onInput={setKeyword}
            />

            <div class='scrollbar-thin -mx-4 mt-3 min-h-0 flex-1 overflow-y-auto px-4'>
                <Show when={query.isLoading}>
                    <p class='m-0 py-8 text-center text-sm text-fg-muted'>Loading LoRAs...</p>
                </Show>

                <Show when={query.isError}>
                    <div class='flex flex-col items-center gap-3 py-8 text-center'>
                        <p class='m-0 text-sm text-red-300'>Failed to load LoRAs.</p>
                        <Button
                            type='button'
                            classes={{ root: 'text-sm' }}
                            onClick={() => void query.refetch()}
                        >
                            <RefreshCw
                                size={14}
                                strokeWidth={1.8}
                                aria-hidden='true'
                            />
                            Retry
                        </Button>
                    </div>
                </Show>

                <Show when={!query.isLoading && !query.isError}>
                    <Show
                        when={visibleOptions().length > 0}
                        fallback={(
                            <p class='m-0 py-8 text-center text-sm text-fg-muted'>
                                {options().length === 0
                                    ? 'No LoRAs available in ComfyUI.'
                                    : 'No LoRA matches the search.'}
                            </p>
                        )}
                    >
                        <div class='flex flex-col'>
                            <For each={visibleOptions()}>
                                {option => (
                                    <Button
                                        variant='ghost'
                                        role='checkbox'
                                        aria-checked={isSelected(option.value)}
                                        title={option.value}
                                        classes={{
                                            root: cn(
                                                'h-12 w-full justify-between gap-3 rounded-none border-b border-line-subtle text-left text-sm',
                                                isSelected(option.value)
                                                    ? 'bg-accent/15 text-fg shadow-[inset_0_0_0_1px_color-mix(in_oklab,var(--sp-accent)_45%,transparent)]'
                                                    : 'hover:bg-elevated',
                                            ),
                                        }}
                                        onClick={() => toggle(option.value)}
                                    >
                                        <span class='min-w-0 truncate'>{option.label}</span>
                                        <span
                                            class={cn(
                                                'flex size-7 shrink-0 items-center justify-center rounded-md',
                                                isSelected(option.value) ? 'text-accent-fg' : 'text-fg-muted',
                                            )}
                                            aria-hidden='true'
                                        >
                                            <Show
                                                when={isSelected(option.value)}
                                                fallback={(
                                                    <Plus
                                                        size={15}
                                                        strokeWidth={1.8}
                                                    />
                                                )}
                                            >
                                                <Check
                                                    size={15}
                                                    strokeWidth={2}
                                                />
                                            </Show>
                                        </span>
                                    </Button>
                                )}
                            </For>
                        </div>
                    </Show>
                </Show>
            </div>
        </Dialog>
    )
}
