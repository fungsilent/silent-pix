import { Field } from '@ark-ui/solid'
import { clsx } from 'clsx'

type NumberProps = {
    label: string
    value: number
    min?: number
    max?: number
    step?: number
    onChange?: (value: number) => void
    classes?: {
        root?: string
        label?: string
        input?: string
    }
}

export function Number(props: NumberProps) {
    return (
        <Field.Root class={clsx('flex min-w-0 flex-col gap-1', props.classes?.root)}>
            <Field.Label class={clsx('text-xs leading-none text-fg-muted', props.classes?.label)}>
                {props.label}
            </Field.Label>
            <Field.Input
                type='number'
                value={props.value}
                min={props.min}
                max={props.max}
                step={props.step}
                class={clsx(
                    'number-input h-8 min-w-0 rounded-md border border-transparent bg-active px-3 text-xs leading-none text-fg outline-none focus:border-accent focus:ring-3 focus:ring-accent/40',
                    props.classes?.input,
                )}
                onInput={event => props.onChange?.(event.currentTarget.valueAsNumber)}
            />
        </Field.Root>
    )
}
