import { Editable as ArkEditable } from '@ark-ui/solid'
import { clsx } from 'clsx'
import { Pencil } from 'lucide-solid'

type EditableProps = {
    label: string
    value: string
    onChange?: ((value: string) => void) | undefined
    onCommit?: ((value: string) => void) | undefined
    classes?: {
        root?: string
        area?: string
        input?: string
        preview?: string
        trigger?: string
    }
}

export function Editable(props: EditableProps) {
    return (
        <ArkEditable.Root
            value={props.value}
            selectOnFocus
            onValueChange={details => props.onChange?.(details.value)}
            onValueCommit={details => props.onCommit?.(details.value)}
            class={clsx('flex min-w-0 items-center gap-2', props.classes?.root)}
        >
            <ArkEditable.Label class='sr-only'>{props.label}</ArkEditable.Label>
            <ArkEditable.Area class={clsx('min-w-0 flex-1', props.classes?.area)}>
                <ArkEditable.Preview
                    class={clsx(
                        'flex h-8 w-full items-center rounded-md border border-line bg-active px-3 text-sm leading-none text-fg',
                        props.classes?.preview,
                    )}
                />
                <ArkEditable.Input
                    class={clsx(
                        'h-8 w-full rounded-md border border-accent bg-active px-3 text-sm leading-none text-fg outline-none',
                        props.classes?.input,
                    )}
                />
            </ArkEditable.Area>
            <ArkEditable.Control>
                <ArkEditable.EditTrigger
                    class={clsx(
                        'flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-line bg-elevated text-fg-secondary',
                        props.classes?.trigger,
                    )}
                    aria-label={`Edit ${props.label}`}
                >
                    <Pencil
                        size={13}
                        strokeWidth={2}
                        aria-hidden='true'
                    />
                </ArkEditable.EditTrigger>
            </ArkEditable.Control>
        </ArkEditable.Root>
    )
}
