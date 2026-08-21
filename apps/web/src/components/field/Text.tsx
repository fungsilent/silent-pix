import { Field } from '@ark-ui/solid'

import { cn } from '#/lib/cn'

import type { JSX } from 'solid-js'

type TextProps = {
    disabled?: boolean
    label: string
    value: string
    action?: JSX.Element
    icon?: JSX.Element
    onInput?: (value: string) => void
    placeholder?: string
    classes?: {
        root?: string
        label?: string
        control?: string
        field?: string
        icon?: string
        input?: string
        action?: string
    }
}

export function Text(props: TextProps) {
    return (
        <Field.Root class={cn('flex min-w-0 flex-col gap-1', props.classes?.root)}>
            <Field.Label class={cn('text-xs leading-none text-fg-muted', props.classes?.label)}>
                {props.label}
            </Field.Label>
            <div class={cn('flex min-w-0 items-center gap-2', props.classes?.control)}>
                <div class={cn('relative flex min-w-0 flex-1 items-center', props.classes?.field)}>
                    {props.icon && (
                        <span
                            class={cn('pointer-events-none absolute left-3 flex text-fg-muted', props.classes?.icon)}
                            aria-hidden='true'
                        >
                            {props.icon}
                        </span>
                    )}
                    <Field.Input
                        type='text'
                        value={props.value}
                        disabled={props.disabled}
                        placeholder={props.placeholder}
                        class={cn(
                            'h-8 w-full min-w-0 rounded-md border border-transparent bg-active px-3 text-xs leading-none text-fg outline-none placeholder:text-fg-muted focus:border-accent focus:ring-3 focus:ring-accent/40',
                            'disabled:cursor-default disabled:border-line-subtle disabled:bg-white/[0.02] disabled:text-fg-muted',
                            props.icon && 'pl-9',
                            props.classes?.input,
                        )}
                        onInput={event => props.onInput?.(event.currentTarget.value)}
                    />
                </div>
                {props.action && (
                    <div class={cn('shrink-0', props.classes?.action)}>
                        {props.action}
                    </div>
                )}
            </div>
        </Field.Root>
    )
}
