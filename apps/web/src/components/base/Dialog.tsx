import { Dialog as ArkDialog } from '@ark-ui/solid'
import { clsx } from 'clsx'
import { X } from 'lucide-solid'
import { Portal } from 'solid-js/web'

import type { JSX } from 'solid-js'

type DialogProps = {
    open: boolean
    title: string
    description?: string
    children: JSX.Element
    footer?: JSX.Element
    onOpenChange: (open: boolean) => void
    classes?: {
        backdrop?: string
        positioner?: string
        content?: string
        header?: string
        body?: string
        footer?: string
    }
}

export function Dialog(props: DialogProps) {
    return (
        <ArkDialog.Root
            open={props.open}
            onOpenChange={details => props.onOpenChange(details.open)}
        >
            <Portal>
                <ArkDialog.Backdrop
                    class={clsx(
                        'fixed inset-0 z-40 bg-black/70',
                        props.classes?.backdrop,
                    )}
                />
                <ArkDialog.Positioner
                    class={clsx(
                        'fixed inset-0 z-50 flex max-h-[100dvh] items-center justify-center overflow-y-auto p-4',
                        props.classes?.positioner,
                    )}
                >
                    <ArkDialog.Content
                        class={clsx(
                            'flex max-h-[calc(100dvh-2rem)] w-full max-w-lg flex-col overflow-hidden rounded-lg border border-line bg-surface text-fg-secondary shadow-2xl outline-none',
                            props.classes?.content,
                        )}
                    >
                        <div
                            class={clsx(
                                'flex shrink-0 items-start justify-between gap-4 border-b border-line-subtle px-4 py-3',
                                props.classes?.header,
                            )}
                        >
                            <div class='min-w-0'>
                                <ArkDialog.Title class='m-0 text-base font-bold leading-tight text-fg'>
                                    {props.title}
                                </ArkDialog.Title>
                                {props.description && (
                                    <ArkDialog.Description class='mt-1 text-xs leading-5 text-fg-muted'>
                                        {props.description}
                                    </ArkDialog.Description>
                                )}
                            </div>
                            <ArkDialog.CloseTrigger
                                aria-label='Close dialog'
                                class='flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-md border border-line bg-elevated text-fg-secondary outline-none hover:bg-hover focus:border-accent'
                            >
                                <X
                                    size={15}
                                    strokeWidth={2}
                                    aria-hidden='true'
                                />
                            </ArkDialog.CloseTrigger>
                        </div>
                        <div
                            class={clsx(
                                'min-h-0 flex-1 overflow-y-auto p-4',
                                props.classes?.body,
                            )}
                        >
                            {props.children}
                        </div>
                        {props.footer && (
                            <div
                                class={clsx(
                                    'flex shrink-0 justify-end gap-2 border-t border-line-subtle px-4 py-3',
                                    props.classes?.footer,
                                )}
                            >
                                {props.footer}
                            </div>
                        )}
                    </ArkDialog.Content>
                </ArkDialog.Positioner>
            </Portal>
        </ArkDialog.Root>
    )
}
