import { Field } from '@ark-ui/solid'
import { clsx } from 'clsx'

import type { JSX } from 'solid-js'

type TextProps = {
    label: string
    value: string
    action?: JSX.Element
    onInput?: (value: string) => void
    placeholder?: string
    classes?: {
        root?: string
        label?: string
        control?: string
        input?: string
        action?: string
    }
}

export function Text(props: TextProps) {
    return (
        <Field.Root class={clsx('flex min-w-0 flex-col gap-1', props.classes?.root)}>
            <Field.Label class={clsx('text-xs leading-none text-[#9fb0c7]', props.classes?.label)}>
                {props.label}
            </Field.Label>
            <div class={clsx('flex min-w-0 items-center gap-2', props.classes?.control)}>
                <Field.Input
                    type='text'
                    value={props.value}
                    placeholder={props.placeholder}
                    class={clsx(
                        'h-8 min-w-0 flex-1 rounded-md border border-[#35445a] bg-[#101721] px-3 text-sm leading-none text-white outline-none placeholder:text-[#617188] focus:border-blue-500',
                        props.classes?.input,
                    )}
                    onInput={event => props.onInput?.(event.currentTarget.value)}
                />
                {props.action && (
                    <div class={clsx('shrink-0', props.classes?.action)}>
                        {props.action}
                    </div>
                )}
            </div>
        </Field.Root>
    )
}
