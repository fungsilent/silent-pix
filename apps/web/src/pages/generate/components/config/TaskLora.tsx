import { Plus, X } from 'lucide-solid'
import { createSignal, Index, Show } from 'solid-js'

import { Button } from '#/components/base/Button'
import { FieldHint } from '#/components/base/FieldHint'
import { DetailSection } from '#/components/detail'
import { Number, Slider } from '#/components/field'
import { cn } from '#/lib/cn'
import { LoraDialog } from '#/pages/generate/components/config/LoraDialog'
import { useGenerateStore } from '#/pages/generate/store'

import type { TaskDetailMode } from '#/pages/generate/components/config/TaskDetailMode'

type TaskLoraProps = {
    mode: TaskDetailMode
}

export function TaskLora(props: TaskLoraProps) {
    const form = useGenerateStore().form
    const loras = form.useSelector(state => state.values.lora)
    const [dialogOpen, setDialogOpen] = createSignal(false)
    const isView = () => props.mode === 'view'

    return (
        <form.Field
            name='lora'
            mode='array'
        >
            {loraField => {
                return (
                    <DetailSection
                        title='LoRA'
                        count={loras().length >= 2 ? loras().length : undefined}
                    >
                        <div class='flex flex-col gap-2'>
                            <Index each={loras()}>
                                {(lora, index) => (
                                    <div class='flex flex-col gap-2 rounded-lg bg-elevated px-2.5 py-2'>
                                        {/* 固定高度：X 在唯讀時消失，卡片高度不該跟著塌 */}
                                        <div class='flex h-6 items-center gap-1.5'>
                                            <span
                                                class={cn(
                                                    'min-w-0 flex-1 truncate text-xs leading-none',
                                                    isView() ? 'text-fg-secondary' : 'text-fg',
                                                )}
                                                title={lora().name}
                                            >
                                                {lora().name}
                                            </span>
                                            <Show when={!isView()}>
                                                <Button
                                                    variant='ghost'
                                                    aria-label={`Remove ${lora().name}`}
                                                    classes={{ root: 'size-6 shrink-0 rounded p-0 hover:bg-danger/15 hover:text-danger-fg' }}
                                                    onClick={() => loraField().removeValue(index)}
                                                >
                                                    <X
                                                        size={13}
                                                        strokeWidth={1.8}
                                                        aria-hidden='true'
                                                    />
                                                </Button>
                                            </Show>
                                        </div>
                                        <form.Field name={`lora[${index}].weight`}>
                                            {weightField => (
                                                <div class='flex items-center gap-2.5'>
                                                    <Slider
                                                        label={`${lora().name} weight`}
                                                        value={weightField().state.value}
                                                        min={0}
                                                        max={2}
                                                        step={0.05}
                                                        disabled={isView()}
                                                        onChange={weightField().handleChange}
                                                        classes={{
                                                            root: 'flex-1',
                                                        }}
                                                    />
                                                    <Number
                                                        label={`${lora().name} weight`}
                                                        value={weightField().state.value}
                                                        min={0}
                                                        max={2}
                                                        step={0.05}
                                                        disabled={isView()}
                                                        onChange={weightField().handleChange}
                                                        classes={{
                                                            root: 'w-[64px]',
                                                            label: 'sr-only',
                                                            input: 'h-6 w-full px-2 text-center text-xs',
                                                        }}
                                                    />
                                                </div>
                                            )}
                                        </form.Field>
                                    </div>
                                )}
                            </Index>
                        </div>

                        <Show when={loras().length === 0}>
                            <FieldHint>No LoRA selected.</FieldHint>
                        </Show>

                        <Button
                            disabled={isView()}
                            type='button'
                            variant='accent'
                            onClick={() => setDialogOpen(true)}
                        >
                            <Plus
                                size={13}
                                strokeWidth={1.8}
                                aria-hidden='true'
                            />
                            <span class='leading-none'>Select LoRA</span>
                        </Button>
                        <LoraDialog
                            open={dialogOpen()}
                            onOpenChange={setDialogOpen}
                        />
                    </DetailSection>
                )
            }}
        </form.Field>
    )
}
