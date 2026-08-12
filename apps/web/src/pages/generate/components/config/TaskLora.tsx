import { Plus, X } from 'lucide-solid'
import { createSignal, For } from 'solid-js'

import { Button } from '#/components/base/Button'
import { Number, Slider } from '#/components/field'
import { LoraDialog } from '#/pages/generate/components/config/LoraDialog'
import { useGenerateStore } from '#/pages/generate/store'

export function TaskLora() {
    const store = useGenerateStore()
    const [dialogOpen, setDialogOpen] = createSignal(false)

    return (
        <section class='flex flex-col gap-2 pt-1'>
            <h3 class='m-0 text-sm font-bold leading-none text-fg'>LoRA</h3>

            <div class='flex flex-col gap-2'>
                <For each={store.state.values.lora}>
                    {lora => (
                        <div class='flex flex-col gap-3 rounded-md border border-line-subtle bg-active p-2'>
                            <div class='flex items-start gap-2'>
                                <span class='min-w-0 flex-1 truncate pt-2 text-sm font-bold leading-none text-fg'>
                                    {lora.name}
                                </span>
                                <Button
                                    aria-label={`Remove ${lora.name}`}
                                    classes={{ root: 'h-8 w-8 border-line p-0 text-red-400' }}
                                    onClick={() => store.removeLora(lora.id)}
                                >
                                    <X
                                        size={13}
                                        strokeWidth={2}
                                        aria-hidden='true'
                                    />
                                </Button>
                            </div>
                            <div class='flex items-center gap-2'>
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
                                        root: 'w-[80px]',
                                        label: 'sr-only',
                                        input: 'w-full px-2 text-center',
                                    }}
                                />
                            </div>
                        </div>
                    )}
                </For>
            </div>

            <Button
                type='button'
                classes={{ root: 'h-7 border-accent/70 bg-accent/15 p-0 text-accent-fg' }}
                onClick={() => setDialogOpen(true)}
            >
                <Plus
                    size={13}
                    strokeWidth={2}
                    aria-hidden='true'
                />
                <span class='text-sm leading-none'>Add LoRA</span>
            </Button>
            <LoraDialog
                open={dialogOpen()}
                onOpenChange={setDialogOpen}
            />
        </section>
    )
}
