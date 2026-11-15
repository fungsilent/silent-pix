import { SegmentGroup as ArkSegmentGroup } from '@ark-ui/solid'
import { For, Show } from 'solid-js'

import { cn } from '#/lib/cn'

import type { JSX } from 'solid-js'

export type SegmentGroupOption<Value extends string> = {
    value: Value
    label: () => string
    icon?: () => JSX.Element
}

type SegmentGroupProps<Value extends string> = {
    value: Value | null
    options: readonly SegmentGroupOption<Value>[]
    disabled?: boolean
    classes?: {
        root?: string
    }
    onChange: (value: Value) => void
}

export function SegmentGroup<Value extends string>(props: SegmentGroupProps<Value>) {
    return (
        <ArkSegmentGroup.Root
            value={props.value}
            disabled={props.disabled}
            orientation='horizontal'
            class={cn('flex h-7 w-fit shrink-0 items-center gap-0.5 rounded-md border border-line-subtle bg-elevated p-px', props.classes?.root)}
            onValueChange={details => {
                const option = props.options.find(item => item.value === details.value)
                if (option) props.onChange(option.value)
            }}
        >
            <For each={props.options}>
                {option => (
                    <ArkSegmentGroup.Item
                        value={option.value}
                        class={cn(
                            'flex h-6 items-center justify-center rounded border border-transparent px-2.5 font-medium',
                            option.icon ? 'gap-1.5 text-xs' : 'min-w-[50px] text-[11.5px]',
                            'bg-transparent text-fg-muted hover:bg-hover',
                            'data-[focus-visible]:border-accent data-[focus-visible]:ring-2 data-[focus-visible]:ring-accent/40',
                            'data-[disabled]:cursor-not-allowed data-[disabled]:opacity-60',
                            'data-[state=checked]:bg-selected data-[state=checked]:text-fg data-[state=checked]:hover:bg-selected',
                        )}
                    >
                        <Show when={option.icon}>
                            {icon => icon()()}
                        </Show>
                        <ArkSegmentGroup.ItemText>{option.label()}</ArkSegmentGroup.ItemText>
                        <ArkSegmentGroup.ItemHiddenInput />
                    </ArkSegmentGroup.Item>
                )}
            </For>
        </ArkSegmentGroup.Root>
    )
}
