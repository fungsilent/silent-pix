import { Plus, X } from 'lucide-solid'
import { createSignal, For, Show } from 'solid-js'

import { Button } from '#/components/base/Button'
import { SectionTitle } from '#/components/base/SectionTitle'
import { Number, Slider } from '#/components/field'
import { LoraDialog } from '#/pages/generate/components/config/LoraDialog'
import { useGenerateStore } from '#/pages/generate/store'

export function TaskLora() {
    const store = useGenerateStore()
    const [dialogOpen, setDialogOpen] = createSignal(false)
    const loras = () => store.state.values.lora

    return (
        <section class='flex flex-col gap-2 pt-1'>
            <SectionTitle count={loras().length >= 2 ? loras().length : undefined}>
                LoRA
            </SectionTitle>

            <div class='flex flex-col gap-2'>
                <For each={loras()}>
                    {lora => (
                        // LoRA 沒有縮圖，不得新增
                        <div class='flex flex-col gap-2 rounded-lg bg-active px-2.5 py-2'>
                            <div class='flex items-center gap-1.5'>
                                <span
                                    class='min-w-0 flex-1 truncate text-xs leading-none text-fg'
                                    title={lora.name}
                                >
                                    {lora.name}
                                </span>
                                <button
                                    type='button'
                                    aria-label={`Remove ${lora.name}`}
                                    class='flex size-6 shrink-0 cursor-pointer items-center justify-center rounded text-fg-muted hover:bg-red-500/12 hover:text-red-400'
                                    onClick={() => store.removeLora(lora.id)}
                                >
                                    <X
                                        size={13}
                                        strokeWidth={1.8}
                                        aria-hidden='true'
                                    />
                                </button>
                            </div>
                            <div class='flex items-center gap-2.5'>
                                <Slider
                                    label={`${lora.name} weight`}
                                    value={lora.weight}
                                    min={0}
                                    max={2}
                                    step={0.05}
                                    onChange={value => store.setLoraWeight(lora.id, value)}
                                    classes={{
                                        root: 'flex-1',
                                    }}
                                />
                                <Number
                                    label={`${lora.name} weight`}
                                    value={lora.weight}
                                    min={0}
                                    max={2}
                                    step={0.05}
                                    onChange={value => store.setLoraWeight(lora.id, value)}
                                    classes={{
                                        root: 'w-[64px]',
                                        label: 'sr-only',
                                        input: 'h-6 w-full bg-elevated px-2 text-center text-xs',
                                    }}
                                />
                            </div>
                        </div>
                    )}
                </For>
            </div>

            <Show when={loras().length === 0}>
                <p class='m-0 text-xs text-fg-muted'>No LoRA selected.</p>
            </Show>

            <Button
                type='button'
                classes={{ root: 'h-7 border-transparent bg-accent/15 p-0 text-accent-fg hover:bg-accent/25' }}
                onClick={() => setDialogOpen(true)}
            >
                <Plus
                    size={13}
                    strokeWidth={1.8}
                    aria-hidden='true'
                />
                <span class='text-xs leading-none'>Add LoRA</span>
            </Button>
            <LoraDialog
                open={dialogOpen()}
                onOpenChange={setDialogOpen}
            />
        </section>
    )
}
