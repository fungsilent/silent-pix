import { Plus, X } from 'lucide-solid'
import { createEffect, createSignal, Index, Show } from 'solid-js'

import { Button } from '#/components/base/Button'
import { FieldHint } from '#/components/base/FieldHint'
import { Loading } from '#/components/base/Loading'
import { DetailSection } from '#/components/detail'
import { Number, Slider } from '#/components/field'
import { TaskLoraPickerDialog } from '#/components/task/detail/TaskLoraPickerDialog'
import { cn } from '#/lib/cn'

import type { SelectOption } from '#/components/field'
import type { Accessor } from 'solid-js'

type TaskLoraItem = {
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

type TaskLoraProps = {
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
                                <div class='flex flex-col gap-2 rounded-lg border border-line bg-surface px-2.5 py-2'>
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
                                                classes={{ root: 'size-6 shrink-0 rounded p-0 hover:bg-danger/15 hover:text-danger-fg' }}
                                                onClick={() => onRemove(index)}
                                            >
                                                <X
                                                    size={13}
                                                    strokeWidth={1.8}
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
                                                label: 'hidden',
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
                        tone='accent'
                        classes={{ root: 'w-full' }}
                        onClick={() => onPickerOpenChange(true)}
                    >
                        <Plus
                            size={13}
                            strokeWidth={1.8}
                        />
                        <span class='leading-none'>Select LoRA</span>
                    </Button>
                </Loading.Mask>
                <TaskLoraPickerDialog
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
