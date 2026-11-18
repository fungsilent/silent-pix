import { RefreshCw, TriangleAlert } from 'lucide-solid'
import { Show } from 'solid-js'

import { Button } from '#/components/base/Button'
import { cn } from '#/lib/cn'
import { t } from '#/lib/i18n'

import type { JSX } from 'solid-js'

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
        icon?: string
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
        /* 預設是 Retry；App 啟動失敗時是 Reload */
        retryLabel?: string
        onRetry: () => void
    }
    | {
        kind: 'content-error'
        message: string
        /* 依內容選，例如圖片用 ImageOff；沒給就是警告三角 */
        icon?: JSX.Element
    }
)

export function StatusMessage(props: StatusMessageProps) {
    const compact = () => props.size === 'compact'
    const title = () => props.kind === 'empty' ? props.title : undefined
    const icon = () => {
        if (compact()) {
            return undefined
        }
        if (props.kind === 'empty') {
            return props.icon
        }
        return props.kind === 'content-error'
            ? props.icon ?? (
                <TriangleAlert
                    size={21}
                    strokeWidth={1.5}
                />
            )
            : undefined
    }
    const action = (): StatusMessageAction | undefined => {
        if (props.kind === 'empty') {
            return props.action
        }

        if (props.kind === 'load-error') {
            const onRetry = props.onRetry

            return {
                label: props.retryLabel ?? t('common.retry'),
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
                    <div
                        class={cn(
                            'grid size-12 place-items-center rounded-xl border',
                            props.kind === 'content-error'
                                ? 'border-danger/25 bg-danger-soft text-danger-fg'
                                : 'border-line-subtle bg-elevated text-fg-muted',
                            props.classes?.icon,
                        )}
                    >
                        {value()}
                    </div>
                )}
            </Show>
            <Show when={compact() && props.kind === 'content-error'}>
                <TriangleAlert
                    size={14}
                    strokeWidth={1.8}
                    class='text-danger-fg'
                />
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
