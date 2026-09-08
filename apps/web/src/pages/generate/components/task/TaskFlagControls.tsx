import { Pin, Trash2 } from 'lucide-solid'

import { Button } from '#/components/base/Button'
import { cn } from '#/lib/cn'

import type { TaskApi } from '@silent-pix/shared'

type TaskFlagControlsClasses = {
    root?: string
    pinActive?: string
    pinInactive?: string
    discardActive?: string
    discardInactive?: string
}

type TaskFlagControlsProps = {
    pin: boolean
    discard: boolean
    pending: boolean
    onChange: (flag: TaskApi.TaskFlag | null) => void
    classes?: TaskFlagControlsClasses
}

export function TaskFlagControls(props: TaskFlagControlsProps) {
    return (
        <div class={cn('absolute flex', props.classes?.root)}>
            <Button
                variant='ghost'
                data-marquee-control='true'
                aria-label={props.pin ? 'Unpin task' : 'Pin task'}
                aria-pressed={props.pin}
                disabled={props.pending}
                classes={{
                    root: cn(
                        'size-7 shrink-0 rounded-md border-0 p-0',
                        props.pin ? props.classes?.pinActive : props.classes?.pinInactive,
                    ),
                }}
                onClick={() => props.onChange(props.pin ? null : 'pin')}
            >
                <Pin
                    size={14}
                    strokeWidth={1.8}
                    aria-hidden='true'
                />
            </Button>
            <Button
                variant='ghost'
                data-marquee-control='true'
                aria-label={props.discard ? 'Remove discard flag' : 'Discard task'}
                aria-pressed={props.discard}
                disabled={props.pending}
                classes={{
                    root: cn(
                        'size-7 shrink-0 rounded-md border-0 p-0',
                        props.discard ? props.classes?.discardActive : props.classes?.discardInactive,
                    ),
                }}
                onClick={() => props.onChange(props.discard ? null : 'discard')}
            >
                <Trash2
                    size={14}
                    strokeWidth={1.8}
                    aria-hidden='true'
                />
            </Button>
        </div>
    )
}
