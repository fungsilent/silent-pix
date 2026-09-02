import { Check, Plus, RefreshCw, Search, X } from 'lucide-solid'
import { createEffect, createSignal, For, Index, Show } from 'solid-js'

import { Button } from '#/components/base/Button'
import { Dialog } from '#/components/base/Dialog'
import { FieldHint } from '#/components/base/FieldHint'
import { Loading } from '#/components/base/Loading'
import { DetailSection } from '#/components/detail'
import { Number, Slider, Text } from '#/components/field'
import { cn } from '#/lib/cn'

import type { SelectOption } from '#/components/field'
import type { Accessor } from 'solid-js'

export type TaskLoraItem = {
    id: string
    name: string
    weight: number
}

export type TaskLoraData = {
    loras: Accessor<TaskLoraItem[]>
}

export type TaskLoraCreateData = TaskLoraData & {
    pickerOpen: Accessor<boolean>
    options: Accessor<SelectOption[]>
    loading: Accessor<boolean>
    error: Accessor<boolean>
}

export type TaskLoraActions = {
    onWeightChange: (index: number, value: number) => void
    onRemove: (index: number) => void
    onSelection: (names: string[]) => void
    onRetry: () => void
    setPickerOpen: (open: boolean) => void
}

export type TaskLoraProps = {
    mode: 'create'
    data: TaskLoraCreateData
    actions: TaskLoraActions
    loading: Accessor<boolean>
} | {
    mode: 'view'
    data: TaskLoraData
    loading: Accessor<boolean>
}

export function TaskLora(props: TaskLoraProps) {
    const [wasOpen, setWasOpen] = createSignal(false)
    const [keyword, setKeyword] = createSignal('')
    const [selected, setSelected] = createSignal<string[]>([])
    const isCreate = () => props.mode === 'create'
    const loras = () => props.data.loras()
    const pickerOpen = () => props.mode === 'create' ? props.data.pickerOpen() : false
    const options = () => props.mode === 'create' ? props.data.options() : []
    const pickerLoading = () => props.mode === 'create' ? props.data.loading() : false
    const pickerError = () => props.mode === 'create' ? props.data.error() : false

    createEffect(() => {
        const open = pickerOpen()

        if (open && !wasOpen()) {
            setSelected(loras().map(lora => lora.name))
            setKeyword('')
        }

        setWasOpen(open)
    })

    const onWeightChange = (index: number, value: number) => {
        if (props.mode === 'create') {
            props.actions.onWeightChange(index, value)
        }
    }

    const onRemove = (index: number) => {
        if (props.mode === 'create') {
            props.actions.onRemove(index)
        }
    }

    const onPickerOpenChange = (open: boolean) => {
        if (props.mode === 'create') {
            props.actions.setPickerOpen(open)
        }
    }

    const onRetry = () => {
        if (props.mode === 'create') {
            props.actions.onRetry()
        }
    }

    const apply = () => {
        if (props.mode === 'create') {
            props.actions.onSelection(selected())
            props.actions.setPickerOpen(false)
        }
    }

    return (
        <DetailSection
            title='LoRA'
            count={!props.loading() && loras().length >= 2 ? loras().length : undefined}
            inert={props.loading()}
        >
            <Show when={loras().length > 0}>
                <div class='flex flex-col gap-2'>
                    <Index each={loras()}>
                        {(lora, index) => (
                            <Loading.Mask
                                class='rounded-lg'
                                loading={props.loading}
                            >
                                <div class='flex flex-col gap-2 rounded-lg bg-elevated px-2.5 py-2'>
                                    <div class='flex h-6 items-center gap-1.5'>
                                        <span
                                            class={cn(
                                                'min-w-0 flex-1 truncate text-xs leading-none',
                                                isCreate() ? 'text-fg' : 'text-fg-secondary',
                                            )}
                                            title={lora().name}
                                        >
                                            {lora().name}
                                        </span>
                                        <Show when={isCreate()}>
                                            <Button
                                                variant='ghost'
                                                aria-label={`Remove ${lora().name}`}
                                                classes={{ root: 'size-6 shrink-0 rounded p-0 hover:bg-danger/15 hover:text-danger-fg' }}
                                                onClick={() => onRemove(index)}
                                            >
                                                <X
                                                    size={13}
                                                    strokeWidth={1.8}
                                                    aria-hidden='true'
                                                />
                                            </Button>
                                        </Show>
                                    </div>
                                    <div class='flex items-center gap-2.5'>
                                        <Slider
                                            label={`${lora().name} weight`}
                                            value={lora().weight}
                                            min={0}
                                            max={2}
                                            step={0.05}
                                            disabled={!isCreate()}
                                            onChange={value => onWeightChange(index, value)}
                                            classes={{ root: 'flex-1' }}
                                        />
                                        <Number
                                            label={`${lora().name} weight`}
                                            value={lora().weight}
                                            min={0}
                                            max={2}
                                            step={0.05}
                                            disabled={!isCreate()}
                                            onChange={value => onWeightChange(index, value)}
                                            classes={{
                                                root: 'w-[64px]',
                                                label: 'sr-only',
                                                input: 'h-6 w-full px-2 text-center text-xs',
                                            }}
                                        />
                                    </div>
                                </div>
                            </Loading.Mask>
                        )}
                    </Index>
                </div>
            </Show>

            <Show when={loras().length === 0}>
                <Loading.Mask loading={props.loading}>
                    <FieldHint>No LoRA selected.</FieldHint>
                </Loading.Mask>
            </Show>

            <Show when={isCreate()}>
                <Loading.Mask loading={props.loading}>
                    <Button
                        type='button'
                        variant='accent'
                        classes={{ root: 'w-full' }}
                        onClick={() => onPickerOpenChange(true)}
                    >
                        <Plus
                            size={13}
                            strokeWidth={1.8}
                            aria-hidden='true'
                        />
                        <span class='leading-none'>Select LoRA</span>
                    </Button>
                </Loading.Mask>
                <LoraPickerDialog
                    open={pickerOpen()}
                    options={options()}
                    loading={pickerLoading()}
                    error={pickerError()}
                    selected={selected()}
                    keyword={keyword()}
                    onKeywordChange={setKeyword}
                    onToggle={name => setSelected(current => current.includes(name)
                        ? current.filter(item => item !== name)
                        : [...current, name])}
                    onApply={apply}
                    onRetry={onRetry}
                    onOpenChange={onPickerOpenChange}
                />
            </Show>
        </DetailSection>
    )
}

type LoraPickerDialogProps = {
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

function LoraPickerDialog(props: LoraPickerDialogProps) {
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
