import { Select as ArkSelect, createListCollection } from '@ark-ui/solid'
import { Check, ChevronDown } from 'lucide-solid'
import { createMemo, For } from 'solid-js'

import { cn } from '#/lib/cn'

type SelectOption = {
    label: string
    value: string
}

type SelectProps = {
    label: string
    options: SelectOption[]
    value: string
    disabled?: boolean | undefined
    onChange?: (value: string) => void
    classes?: {
        root?: string
        label?: string
        trigger?: string
        content?: string
        item?: string
    }
}

export function Select(props: SelectProps) {
    const collection = createMemo(() => createListCollection({
        items: props.options,
    }))

    return (
        <ArkSelect.Root
            collection={collection()}
            value={[props.value]}
            disabled={props.disabled}
            onValueChange={details => {
                const value = details.value[0]

                if (value) {
                    props.onChange?.(value)
                }
            }}
            class={cn('flex min-w-0 flex-col gap-1', props.classes?.root)}
        >
            <ArkSelect.Label class={cn('text-xs leading-none text-fg-muted', props.classes?.label)}>
                {props.label}
            </ArkSelect.Label>
            <ArkSelect.Control>
                <ArkSelect.Trigger
                    class={cn(
                        'flex h-8 w-full min-w-0 cursor-pointer items-center justify-between gap-2 rounded-md border border-transparent bg-active px-3 text-left text-xs leading-none text-fg outline-none focus:border-accent focus:ring-3 focus:ring-accent/40 disabled:cursor-not-allowed disabled:opacity-60',
                        props.classes?.trigger,
                    )}
                >
                    <ArkSelect.ValueText />
                    <ArkSelect.Indicator class='shrink-0 text-fg-secondary'>
                        <ChevronDown
                            size={15}
                            strokeWidth={2}
                            aria-hidden='true'
                        />
                    </ArkSelect.Indicator>
                </ArkSelect.Trigger>
            </ArkSelect.Control>
            <ArkSelect.Positioner>
                <ArkSelect.Content
                    class={cn(
                        'z-10 mt-1 min-w-[var(--reference-width)] overflow-hidden rounded-md border border-line bg-elevated p-1 shadow-xl',
                        props.classes?.content,
                    )}
                >
                    <ArkSelect.List>
                        <For each={props.options}>
                            {option => (
                                <ArkSelect.Item
                                    item={option}
                                    class={cn(
                                        'flex h-8 cursor-default items-center justify-between gap-2 rounded px-2 text-xs text-fg outline-none data-[highlighted]:bg-accent/20',
                                        props.classes?.item,
                                    )}
                                >
                                    <ArkSelect.ItemText>{option.label}</ArkSelect.ItemText>
                                    <ArkSelect.ItemIndicator class='text-accent-fg'>
                                        <Check
                                            size={13}
                                            strokeWidth={2}
                                            aria-hidden='true'
                                        />
                                    </ArkSelect.ItemIndicator>
                                </ArkSelect.Item>
                            )}
                        </For>
                    </ArkSelect.List>
                </ArkSelect.Content>
            </ArkSelect.Positioner>
            <ArkSelect.HiddenSelect />
        </ArkSelect.Root>
    )
}
