import { Menu as ArkMenu } from '@ark-ui/solid'
import { Portal } from 'solid-js/web'

import { cn } from '#/lib/cn'

import type { JSX } from 'solid-js'

/* MARK: Menu */

type MenuProps = {
    trigger: JSX.Element
    children: JSX.Element
    classes?: {
        trigger?: string
        content?: string
    }
}

export function Menu(props: MenuProps) {
    return (
        <ArkMenu.Root positioning={{ placement: 'bottom-start', gutter: 4 }}>
            <ArkMenu.Trigger
                class={cn(
                    'flex cursor-pointer items-center justify-center rounded-md border border-transparent outline-none',
                    'data-[state=open]:bg-active data-[state=open]:text-fg data-[state=open]:shadow-inset',
                    'hover:bg-hover focus-visible:border-accent focus-visible:ring-2 focus-visible:ring-accent/40',
                    props.classes?.trigger,
                )}
            >
                {props.trigger}
            </ArkMenu.Trigger>
            <Portal>
                <ArkMenu.Positioner class='z-50'>
                    <ArkMenu.Content
                        class={cn(
                            'flex w-[212px] flex-col rounded-md border border-line bg-elevated p-1 shadow-popover outline-none',
                            props.classes?.content,
                        )}
                    >
                        {props.children}
                    </ArkMenu.Content>
                </ArkMenu.Positioner>
            </Portal>
        </ArkMenu.Root>
    )
}

/* MARK: MenuItem */

type MenuItemProps = {
    value: string
    icon: JSX.Element
    label: string
    meta?: string
    current?: boolean
    disabled?: boolean
    tone?: 'neutral' | 'danger'
    onSelect: () => void
}

export function MenuItem(props: MenuItemProps) {
    return (
        <ArkMenu.Item
            value={props.value}
            disabled={props.disabled ?? false}
            class={cn(
                'flex h-8 cursor-pointer items-center gap-2 rounded px-2 text-xs outline-none',
                '[&_svg]:shrink-0 [&_svg]:text-fg-muted',
                props.tone === 'danger'
                    ? 'text-danger-fg [&_svg]:text-danger-fg data-[highlighted]:bg-danger/12'
                    : 'text-fg data-[highlighted]:bg-hover',
                props.current && 'bg-active shadow-inset [&_svg]:text-fg',
                props.disabled && 'cursor-default text-fg-muted data-[highlighted]:bg-transparent',
            )}
            onSelect={props.onSelect}
        >
            {props.icon}
            <span class='min-w-0 truncate'>{props.label}</span>
            {props.meta && (
                <span class='ml-auto shrink-0 text-[11px] text-fg-muted'>{props.meta}</span>
            )}
        </ArkMenu.Item>
    )
}

/* MARK: MenuSection */

type MenuSectionProps = {
    label: string
}

export function MenuSection(props: MenuSectionProps) {
    return (
        <span class='px-2 pb-0.5 pt-1.5 text-[10px] font-semibold uppercase tracking-wide text-fg-muted'>
            {props.label}
        </span>
    )
}

export function MenuSeparator() {
    return <ArkMenu.Separator class='my-1 h-px border-0 bg-line-subtle' />
}
