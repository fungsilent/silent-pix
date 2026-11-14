import { RefreshCw } from 'lucide-solid'
import { Show } from 'solid-js'

import { Button } from '#/components/base/Button'
import { cn } from '#/lib/cn'
import { t } from '#/lib/i18n'

import type { JSX } from 'solid-js'

/*
 * 所有空狀態與錯誤提示共用的置中訊息。三種類型：
 * - empty：muted 文字，尚未選取或加入時可帶一顆 solid accent 引導鈕。
 * - load-error：一句 muted 訊息 + Retry。
 * - content-error：一句 danger 文字，不放 Retry。
 * regular 用在大區塊（由所在區塊負責置中），compact 用在側欄與 dialog 內的清單。
 */
type StatusMessageSize = 'regular' | 'compact'

type StatusMessageAction = {
    label: string
    icon?: JSX.Element
    onClick: () => void
}

type StatusMessageProps = {
    size?: StatusMessageSize
    classes?: {
        root?: string
        message?: string
    }
} & (
    | {
        kind: 'empty'
        title?: string
        message?: string
        icon?: JSX.Element
        action?: StatusMessageAction
    }
    | {
        kind: 'load-error'
        message: string
        onRetry: () => void
    }
    | {
        kind: 'content-error'
        message: string
    }
)

export function StatusMessage(props: StatusMessageProps) {
    const compact = () => props.size === 'compact'
    const title = () => props.kind === 'empty' ? props.title : undefined
    const icon = () => props.kind === 'empty' && !compact() ? props.icon : undefined
    const action = (): StatusMessageAction | undefined => {
        if (props.kind === 'empty') {
            return props.action
        }

        if (props.kind === 'load-error') {
            const onRetry = props.onRetry

            return {
                label: t('common.retry'),
                icon: (
                    <RefreshCw
                        size={compact() ? 13 : 14}
                        strokeWidth={1.8}
                    />
                ),
                onClick: () => onRetry(),
            }
        }

        return undefined
    }

    return (
        <div
            class={cn(
                'flex flex-col items-center text-center',
                compact() ? 'gap-2 px-3 py-8' : 'max-w-[280px] gap-3',
                props.classes?.root,
            )}
        >
            <Show when={icon()}>
                {value => (
                    <div class='grid size-12 place-items-center rounded-xl border border-line-subtle bg-elevated text-fg-muted'>
                        {value()}
                    </div>
                )}
            </Show>
            <div class='flex flex-col gap-1'>
                <Show when={title()}>
                    {value => (
                        <p class={cn('m-0 font-medium text-fg', compact() ? 'text-xs' : 'text-sm')}>{value()}</p>
                    )}
                </Show>
                <Show when={props.message}>
                    {value => (
                        <p
                            class={cn(
                                'm-0 leading-relaxed',
                                compact() ? 'text-[11px]' : 'text-xs',
                                props.kind === 'content-error' ? 'text-danger-fg' : 'text-fg-muted',
                                props.classes?.message,
                            )}
                        >
                            {value()}
                        </p>
                    )}
                </Show>
            </div>
            <Show when={action()}>
                {value => (
                    <Button
                        variant={props.kind === 'empty' ? 'solid' : 'soft'}
                        tone={props.kind === 'empty' ? 'accent' : 'neutral'}
                        size={compact() ? 'compact' : undefined}
                        classes={{ root: compact() ? '' : 'mt-1' }}
                        onClick={() => value().onClick()}
                    >
                        {value().icon}
                        {value().label}
                    </Button>
                )}
            </Show>
        </div>
    )
}
