import { RefreshCw, TriangleAlert } from 'lucide-solid'
import { Show } from 'solid-js'

import { Button } from '#/components/base/Button'
import { t } from '#/lib/i18n'
import { mergeClasses } from '#/utils/style'

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
)

export function StatusMessage(props: StatusMessageProps) {
    const compact = () => props.size === 'compact'
    const title = () => props.kind === 'empty' ? props.title : undefined
    const icon = () => {
        if (compact()) {
            return undefined
        }
        return props.kind === 'empty' ? props.icon : undefined
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
            class={mergeClasses(
                'flex flex-col items-center text-center',
                compact() ? 'gap-2 px-3 py-8' : 'max-w-[280px] gap-3',
                props.classes?.root,
            )}
        >
            <Show when={icon()}>
                {value => (
                    <div
                        class={mergeClasses(
                            'grid size-12 place-items-center rounded-xl border border-line-subtle bg-elevated text-fg-muted',
                            props.classes?.icon,
                        )}
                    >
                        {value()}
                    </div>
                )}
            </Show>
            <div class='flex flex-col gap-1'>
                <Show when={title()}>
                    {value => (
                        <p class={mergeClasses('m-0 font-medium text-fg', compact() ? 'text-xs' : 'text-sm')}>{value()}</p>
                    )}
                </Show>
                <Show when={props.message}>
                    {value => (
                        <p
                            class={mergeClasses(
                                'm-0 leading-relaxed text-fg-muted',
                                compact() ? 'text-[11px]' : 'text-xs',
                                props.kind === 'load-error' && mergeClasses('flex items-start text-left', compact() ? 'gap-1' : 'gap-1.5'),
                                props.classes?.message,
                            )}
                        >
                            <Show when={props.kind === 'load-error'}>
                                <TriangleAlert
                                    size={compact() ? 11 : 12}
                                    strokeWidth={2}
                                    class={mergeClasses('shrink-0 text-danger-fg', compact() ? 'mt-[3px]' : 'mt-1')}
                                />
                            </Show>
                            <span class='min-w-0'>{value()}</span>
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
