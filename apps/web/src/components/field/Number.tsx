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
            <Field.Label class={clsx('text-xs leading-none text-[#9fb0c7]', props.classes?.label)}>
                {props.label}
            </Field.Label>
            <Field.Input
                type='number'
                value={props.value}
                min={props.min}
                max={props.max}
                step={props.step}
                class={clsx(
                    'number-input h-8 min-w-0 rounded-md border border-[#35445a] bg-[#101721] px-3 text-sm leading-none text-white outline-none focus:border-blue-500',
                    props.classes?.input,
                )}
                onInput={event => props.onChange?.(event.currentTarget.valueAsNumber)}
            />
        </Field.Root>
    )
}
