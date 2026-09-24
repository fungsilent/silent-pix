import { FlagTriangleRight, HeartX } from 'lucide-solid'

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
                disabled={props.pending}
                classes={{
                    root: cn(
                        'size-7 shrink-0 rounded-md border-0 p-0',
                        props.pin ? props.classes?.pinActive : props.classes?.pinInactive,
                    ),
                }}
                onClick={() => props.onChange(props.pin ? null : 'pin')}
            >
                <FlagTriangleRight
                    size={14}
                    strokeWidth={1.8}
                />
            </Button>
            <Button
                variant='ghost'
                data-marquee-control='true'
                disabled={props.pending}
                classes={{
                    root: cn(
                        'size-7 shrink-0 rounded-md border-0 p-0',
                        props.discard ? props.classes?.discardActive : props.classes?.discardInactive,
                    ),
                }}
                onClick={() => props.onChange(props.discard ? null : 'discard')}
            >
                <HeartX
                    size={14}
                    strokeWidth={1.8}
                />
            </Button>
        </div>
    )
}
