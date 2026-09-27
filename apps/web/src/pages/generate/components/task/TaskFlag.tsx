import { FlagTriangleRight, HeartX } from 'lucide-solid'

import { Button } from '#/components/base/Button'
import { cn } from '#/lib/cn'
import { theme } from '#/lib/theme'

import type { TaskApi } from '@silent-pix/shared'
import type { JSX } from 'solid-js'

/* MARK: TaskFlagControls */

type TaskFlagControlsProps = {
    pin: boolean
    discard: boolean
    pending: boolean
    onChange: (flag: TaskApi.TaskFlag | null) => void
    /* 定位由載體決定：卡片掛在 ID 行右端，列浮在右上角 */
    class?: string
}

/*
 * 操作：兩顆都要在才切換得了，所以 active 與 inactive 一起顯示。
 * 兩顆都只在 hover／focus 整張卡或整列時浮現，常駐的視覺訊號交給角摺。
 */
export function TaskFlagControls(props: TaskFlagControlsProps) {
    return (
        <div
            class={cn(
                'absolute flex opacity-0 group-hover:opacity-100 group-focus-within:opacity-100',
                props.class,
            )}
        >
            <TaskFlagButton
                active={props.pin}
                pending={props.pending}
                activeClass={theme.taskFlag.pin.active}
                onClick={() => props.onChange(props.pin ? null : 'pin')}
            >
                <FlagTriangleRight
                    size={14}
                    strokeWidth={1.8}
                />
            </TaskFlagButton>
            <TaskFlagButton
                active={props.discard}
                pending={props.pending}
                activeClass={theme.taskFlag.discard.active}
                onClick={() => props.onChange(props.discard ? null : 'discard')}
            >
                <HeartX
                    size={14}
                    strokeWidth={1.8}
                />
            </TaskFlagButton>
        </div>
    )
}

type TaskFlagButtonProps = {
    active: boolean
    pending: boolean
    activeClass: string
    onClick: () => void
    children: JSX.Element
}

function TaskFlagButton(props: TaskFlagButtonProps) {
    return (
        <Button
            variant='ghost'
            data-marquee-control='true'
            disabled={props.pending}
            classes={{
                root: cn(
                    'size-7 shrink-0 rounded-md border-0 p-0',
                    props.active ? props.activeClass : theme.taskFlag.inactive,
                ),
            }}
            onClick={props.onClick}
        >
            {props.children}
        </Button>
    )
}
