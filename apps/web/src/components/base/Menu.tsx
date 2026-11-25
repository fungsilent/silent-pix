import { Menu as ArkMenu } from '@ark-ui/solid'
import { Portal } from 'solid-js/web'

import { mergeClasses } from '#/utils/style'

import type { JSX } from 'solid-js'

/* MARK: Menu */

type MenuProps = {
    trigger: JSX.Element
    children: JSX.Element
    disabled?: boolean
    classes?: {
        trigger?: string
        content?: string
    }
}

export function Menu(props: MenuProps) {
    return (
        <ArkMenu.Root positioning={{ placement: 'bottom-start', gutter: 4 }}>
            {/* 選完項目焦點會還給觸發鈕並被判成 focus-visible；桌面選單列不顯示焦點框 */}
            <ArkMenu.Trigger
                disabled={props.disabled}
                class={mergeClasses(
                    'flex items-center justify-center rounded-md border border-transparent outline-none',
                    'data-[state=open]:bg-selected data-[state=open]:text-fg',
                    'hover:bg-hover',
                    'disabled:opacity-60 disabled:hover:bg-transparent',
                    props.classes?.trigger,
                )}
            >
                {props.trigger}
            </ArkMenu.Trigger>
            <Portal>
                <ArkMenu.Positioner class='z-50'>
                    <ArkMenu.Content
                        class={mergeClasses(
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
    current?: boolean
    onSelect: () => void
}

export function MenuItem(props: MenuItemProps) {
    return (
        <ArkMenu.Item
            value={props.value}
            class={mergeClasses(
                'flex h-8 items-center gap-2 rounded px-2 text-xs text-fg outline-none',
                '[&_svg]:shrink-0 [&_svg]:text-fg-muted data-[highlighted]:bg-hover',
                props.current && 'bg-selected data-[highlighted]:bg-selected [&_svg]:text-fg',
            )}
            onSelect={props.onSelect}
        >
            {props.icon}
            <span class='min-w-0 truncate'>{props.label}</span>
        </ArkMenu.Item>
    )
}
