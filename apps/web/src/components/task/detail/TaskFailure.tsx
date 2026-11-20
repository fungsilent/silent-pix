import { Collapsible } from '@ark-ui/solid'
import { ChevronRight, TriangleAlert } from 'lucide-solid'
import { Show } from 'solid-js'

import { t } from '#/lib/i18n'

type TaskFailureProps = {
    errorCode: string | null
    errorMessage: string | null
}

export function TaskFailure(props: TaskFailureProps) {
    const reason = () => {
        const reasons = new Map(Object.entries(t('task.failure.reasons', { returnObjects: true })))
        return reasons.get(props.errorCode ?? '') ?? t('task.failure.generic')
    }

    return (
        <div class='min-w-0 border-l-2 border-danger/50 pl-2.5'>
            <span class='flex items-center gap-1.5 text-[11px] text-fg-muted'>
                <TriangleAlert
                    size={12}
                    strokeWidth={2}
                    class='shrink-0 text-danger-fg'
                />
                {t('task.failure.reason')}
            </span>
            <p class='mb-1 mt-1.5 text-xs leading-relaxed text-fg'>{reason()}</p>
            <Collapsible.Root>
                <Collapsible.Trigger class='group flex items-center gap-1 border-0 bg-transparent py-1 text-[11px] text-fg-muted hover:text-fg-secondary'>
                    <ChevronRight
                        size={12}
                        class='shrink-0 group-data-[state=open]:rotate-90'
                    />
                    {t('task.failure.details')}
                </Collapsible.Trigger>
                <Collapsible.Content>
                    <div class='mt-2 flex min-w-0 flex-col gap-2.5'>
                        <Show when={props.errorCode}>
                            <span class='break-all font-mono text-[11px] text-fg-muted'>{props.errorCode}</span>
                        </Show>
                        <Show when={props.errorMessage || !props.errorCode}>
                            <pre class='m-0 max-h-40 overflow-y-auto whitespace-pre-wrap break-words font-mono text-[11px] leading-relaxed text-fg-secondary'>
                                {props.errorMessage || t('task.failure.noDetails')}
                            </pre>
                        </Show>
                    </div>
                </Collapsible.Content>
            </Collapsible.Root>
        </div>
    )
}
