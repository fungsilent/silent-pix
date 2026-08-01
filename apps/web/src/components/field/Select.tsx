import { Select as ArkSelect, createListCollection } from '@ark-ui/solid'
import { clsx } from 'clsx'
import { Check, ChevronDown } from 'lucide-solid'
import { createMemo, For } from 'solid-js'

type SelectOption = {
    label: string
    value: string
}

type SelectProps = {
    label: string
    options: SelectOption[]
    value: string
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
            onValueChange={details => {
                const value = details.value[0]

                if (value) {
                    props.onChange?.(value)
                }
            }}
            class={clsx('flex min-w-0 flex-col gap-1', props.classes?.root)}
        >
            <ArkSelect.Label class={clsx('text-xs leading-none text-[#9fb0c7]', props.classes?.label)}>
                {props.label}
            </ArkSelect.Label>
            <ArkSelect.Control>
                <ArkSelect.Trigger
                    class={clsx(
                        'flex h-8 w-full min-w-0 items-center justify-between gap-2 rounded-md border border-[#35445a] bg-[#101721] px-3 text-left text-sm leading-none text-white outline-none focus:border-blue-500',
                        props.classes?.trigger,
                    )}
                >
                    <ArkSelect.ValueText />
                    <ArkSelect.Indicator class='shrink-0 text-[#c7d2e4]'>
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
                    class={clsx(
                        'z-10 mt-1 min-w-[var(--reference-width)] overflow-hidden rounded-md border border-[#35445a] bg-[#101721] p-1 shadow-xl',
                        props.classes?.content,
                    )}
                >
                    <ArkSelect.List>
                        <For each={props.options}>
                            {option => (
                                <ArkSelect.Item
                                    item={option}
                                    class={clsx(
                                        'flex h-8 cursor-default items-center justify-between gap-2 rounded px-2 text-sm text-white outline-none data-[highlighted]:bg-blue-500/20',
                                        props.classes?.item,
                                    )}
                                >
                                    <ArkSelect.ItemText>{option.label}</ArkSelect.ItemText>
                                    <ArkSelect.ItemIndicator class='text-blue-300'>
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


