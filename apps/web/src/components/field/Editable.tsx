import { Editable as ArkEditable } from '@ark-ui/solid'
import { Pencil } from 'lucide-solid'

import { cn } from '#/lib/cn'

type EditableProps = {
    disabled?: boolean
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
            disabled={props.disabled}
            value={props.value}
            selectOnFocus
            onValueChange={details => props.onChange?.(details.value)}
            onValueCommit={details => props.onCommit?.(details.value)}
            class={cn('flex min-w-0 items-center gap-2', props.classes?.root)}
        >
            <ArkEditable.Label class='sr-only'>{props.label}</ArkEditable.Label>
            <ArkEditable.Area class={cn('min-w-0 flex-1', props.classes?.area)}>
                <ArkEditable.Preview
                    class={cn(
                        'flex h-8 w-full cursor-text items-center truncate rounded-md border border-transparent bg-active px-3 text-xs leading-none text-fg',
                        props.classes?.preview,
                    )}
                />
                <ArkEditable.Input
                    class={cn(
                        'h-8 w-full rounded-md border border-accent bg-active px-3 text-xs leading-none text-fg outline-none ring-3 ring-accent/40',
                        props.classes?.input,
                    )}
                />
            </ArkEditable.Area>
            <ArkEditable.Control>
                <ArkEditable.EditTrigger
                    class={cn(
                        'flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-md border border-transparent text-fg-muted hover:bg-hover hover:text-fg',
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
