import { Field } from '@ark-ui/solid'

import { theme } from '#/lib/theme'
import { mergeClasses } from '#/utils/style'

import type { JSX } from 'solid-js'

type TextProps = {
    disabled?: boolean
    invalid?: boolean
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
        <Field.Root class={mergeClasses('flex min-w-0 flex-col gap-1.5', props.classes?.root)}>
            <Field.Label class={mergeClasses('text-xs leading-none text-fg-muted', props.classes?.label)}>
                {props.label}
            </Field.Label>
            <div class={mergeClasses('flex min-w-0 items-center gap-2', props.classes?.control)}>
                <div class={mergeClasses('relative flex min-w-0 flex-1 items-center', props.classes?.field)}>
                    {props.icon && (
                        <span
                            class={mergeClasses('pointer-events-none absolute left-3 flex text-fg-muted', props.classes?.icon)}
                        >
                            {props.icon}
                        </span>
                    )}
                    <Field.Input
                        type='text'
                        value={props.value}
                        disabled={props.disabled}
                        placeholder={props.placeholder}
                        class={mergeClasses(
                            'h-7 w-full min-w-0 rounded-md border border-field-border bg-field px-3 text-xs leading-none text-fg outline-none placeholder:text-fg-muted focus:border-accent focus:ring-2 focus:ring-accent/40',
                            theme.field.disabled,
                            props.invalid && theme.field.invalid,
                            props.icon && 'pl-9',
                            props.classes?.input,
                        )}
                        onInput={event => props.onInput?.(event.currentTarget.value)}
                    />
                </div>
                {props.action && (
                    <div class={mergeClasses('shrink-0', props.classes?.action)}>
                        {props.action}
                    </div>
                )}
            </div>
        </Field.Root>
    )
}
