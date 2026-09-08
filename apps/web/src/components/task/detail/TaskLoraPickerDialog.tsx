import { Check, Plus, RefreshCw, Search } from 'lucide-solid'
import { For, Show } from 'solid-js'

import { Button } from '#/components/base/Button'
import { Dialog } from '#/components/base/Dialog'
import { Loading } from '#/components/base/Loading'
import { Text } from '#/components/field/Text'
import { cn } from '#/lib/cn'

import type { SelectOption } from '#/components/field'

type TaskLoraPickerDialogProps = {
    open: boolean
    options: SelectOption[]
    loading: boolean
    error: boolean
    selected: string[]
    keyword: string
    onKeywordChange: (value: string) => void
    onToggle: (name: string) => void
    onApply: () => void
    onRetry: () => void
    onOpenChange: (open: boolean) => void
}

const loraSkeletonRows = [0, 1, 2, 3, 4]

export function TaskLoraPickerDialog(props: TaskLoraPickerDialogProps) {
    const visibleOptions = () => {
        const text = props.keyword.trim().toLowerCase()

        if (!text) {
            return props.options
        }

        return props.options.filter(option => option.label.toLowerCase().includes(text))
    }
    const isSelected = (name: string) => props.selected.includes(name)

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
                        {props.selected.length} selected
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
                            onClick={props.onApply}
                        >
                            Apply
                        </Button>
                    </div>
                </div>
            )}
        >
            <Text
                label='Search LoRA'
                value={props.keyword}
                placeholder='Search LoRA...'
                icon={(
                    <Search
                        size={14}
                        strokeWidth={1.8}
                    />
                )}
                classes={{ root: 'shrink-0', label: 'sr-only' }}
                onInput={props.onKeywordChange}
            />

            <div class='scrollbar-thin -mx-4 mt-3 min-h-0 flex-1 overflow-y-auto px-4'>
                <Loading.Swap
                    loading={() => props.open && props.loading}
                    fallback={(
                        <div class='flex flex-col'>
                            <For each={loraSkeletonRows}>
                                {() => <Loading.Skeleton class='h-12 w-full rounded-none border-b border-line-subtle' />}
                            </For>
                        </div>
                    )}
                >
                    <Show when={props.error}>
                        <div class='flex flex-col items-center gap-3 py-8 text-center'>
                            <p class='m-0 text-sm text-red-300'>Failed to load LoRAs.</p>
                            <Button
                                type='button'
                                classes={{ root: 'text-sm' }}
                                onClick={props.onRetry}
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

                    <Show when={!props.error}>
                        <Show
                            when={visibleOptions().length > 0}
                            fallback={(
                                <p class='m-0 py-8 text-center text-sm text-fg-muted'>
                                    {props.options.length === 0
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
                                            onClick={() => props.onToggle(option.value)}
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
                </Loading.Swap>
            </div>
        </Dialog>
    )
}
