import { Button } from '#/components/base/Button'
import { cn } from '#/lib/cn'

import type { LucideProps } from 'lucide-solid'
import type { Component } from 'solid-js'

type FilterChipOption<Value extends string> = {
    value: Value
    label: string
    Icon: Component<LucideProps>
}

type FilterChipsProps<Value extends string> = {
    allOption: Omit<FilterChipOption<Value>, 'value'>
    options: readonly FilterChipOption<Value>[]
    values: readonly Value[] | undefined
    onChange: (values: Value[] | undefined) => void
    selection?: 'multiple' | 'single'
    presentation?: 'icon' | 'label'
    classes?: {
        root?: string
    }
}

export function FilterChips<Value extends string>(props: FilterChipsProps<Value>) {
    const active = (value: Value) => props.values?.includes(value) ?? false
    const select = (value: Value) => {
        const current = props.values
        if (props.selection === 'single') {
            if (current?.length === 1 && current[0] === value) {
                return
            }

            props.onChange([value])
            return
        }

        if (!current) {
            props.onChange([value])
            return
        }

        const next = current.includes(value)
            ? current.filter(currentValue => currentValue !== value)
            : [...current, value]
        const ordered = props.options
            .filter(option => next.includes(option.value))
            .map(option => option.value)

        props.onChange(
            ordered.length > 0 && ordered.length < props.options.length
                ? ordered
                : undefined,
        )
    }

    const buttonContent = (
        option: Omit<FilterChipOption<Value>, 'value'>,
    ) => (
        <>
            <option.Icon
                size={13}
                strokeWidth={1.8}
            />
            {props.presentation === 'icon' ? undefined : option.label}
        </>
    )

    return (
        <div
            class={cn(
                'flex shrink-0 items-center gap-1',
                props.classes?.root,
            )}
        >
            <Button
                variant='ghost'
                title={props.presentation === 'icon' ? props.allOption.label : undefined}
                classes={{
                    root: cn(
                        'h-7 gap-1.5 rounded-md px-2 text-[11px] font-medium',
                        props.values === undefined
                            ? 'bg-active text-fg shadow-inset'
                            : 'text-fg-muted',
                    ),
                }}
                onClick={() => props.onChange(undefined)}
            >
                {buttonContent(props.allOption)}
            </Button>
            {props.options.map(option => (
                <Button
                    variant='ghost'
                    title={props.presentation === 'icon' ? option.label : undefined}
                    classes={{
                        root: cn(
                            'h-7 gap-1.5 rounded-md px-2 text-[11px] font-medium',
                            active(option.value)
                                ? 'bg-active text-fg shadow-inset'
                                : 'text-fg-muted',
                        ),
                    }}
                    onClick={() => select(option.value)}
                >
                    {buttonContent(option)}
                </Button>
            ))}
        </div>
    )
}
