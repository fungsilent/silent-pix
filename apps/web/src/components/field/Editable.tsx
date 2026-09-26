import { Editable as ArkEditable } from '@ark-ui/solid'
import { Pencil } from 'lucide-solid'

import { cn } from '#/lib/cn'
import { theme } from '#/lib/theme'

type EditableProps = {
    disabled?: boolean
    label: string
    placeholder?: string
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
            placeholder={props.placeholder}
            value={props.value}
            selectOnFocus
            onValueChange={details => props.onChange?.(details.value)}
            onValueCommit={details => props.onCommit?.(details.value)}
            class={cn('flex min-w-0 items-center gap-2', props.classes?.root)}
        >
            <ArkEditable.Area class={cn('min-w-0 flex-1', props.classes?.area)}>
                <ArkEditable.Preview
                    class={cn(
                        'flex h-8 w-full cursor-text items-center truncate rounded-md border border-field-border bg-field px-3 text-xs leading-none text-fg data-[placeholder-shown]:text-fg-muted',
                        theme.field.disabledData,
                        props.classes?.preview,
                    )}
                />
                <ArkEditable.Input
                    class={cn(
                        'h-8 w-full rounded-md border border-accent bg-field px-3 text-xs leading-none text-fg outline-none ring-2 ring-accent/40',
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
                >
                    <Pencil
                        size={13}
                        strokeWidth={2}
                    />
                </ArkEditable.EditTrigger>
            </ArkEditable.Control>
        </ArkEditable.Root>
    )
}
