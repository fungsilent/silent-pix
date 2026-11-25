import { ScrollArea } from '@ark-ui/solid'
import { ChevronsLeft, ChevronsRight } from 'lucide-solid'
import { createSignal } from 'solid-js'

import { Button } from '#/components/base/Button'
import { t } from '#/lib/i18n'
import { mergeClasses } from '#/utils/style'

import type { Accessor, JSX } from 'solid-js'

/* MARK: Panel */
type PanelRenderState = {
    collapse: () => void
    expand: () => void
    isCollapsed: Accessor<boolean>
    toggle: () => void
}

/* 要在不同面板之間共用收合狀態時由外部提供；沒給就由 Panel 自己記 */
export type PanelCollapse = {
    collapsed: Accessor<boolean>
    setCollapsed: (collapsed: boolean) => void
}

type PanelProps = {
    children: JSX.Element | ((state: PanelRenderState) => JSX.Element)
    defaultCollapsed?: boolean
    collapse?: PanelCollapse | undefined
    classes?: {
        root?: string
        open?: string
        close?: string
    }
}

export function Panel(props: PanelProps) {
    const [ownCollapsed, setOwnCollapsed] = createSignal(props.defaultCollapsed ?? false)
    const isCollapsed = () => props.collapse ? props.collapse.collapsed() : ownCollapsed()
    const setIsCollapsed = (value: boolean) => {
        if (props.collapse) {
            props.collapse.setCollapsed(value)
        }
        else {
            setOwnCollapsed(value)
        }
    }

    const state: PanelRenderState = {
        collapse: () => {
            setIsCollapsed(true)
        },
        expand: () => {
            setIsCollapsed(false)
        },
        isCollapsed,
        toggle: () => {
            setIsCollapsed(!isCollapsed())
        },
    }

    const render = (content: PanelProps['children']) => {
        if (typeof content === 'function') {
            return content(state)
        }

        return content
    }

    return (
        <aside
            class={mergeClasses(
                'flex-none overflow-hidden bg-surface',
                props.classes?.root,
                isCollapsed() ? props.classes?.close : props.classes?.open,
            )}
        >
            {render(props.children)}
        </aside>
    )
}

/* MARK: CollapsedBar */
type CollapsedBarProps = {
    onClick: () => void
}

/* 收合後只留一顆展開按鈕的面板長這樣。TaskList 那種有自己的收合樣貌就不用它 */
export function CollapsedBar(props: CollapsedBarProps) {
    return (
        <div class='flex h-12 items-center justify-center'>
            <CollapseButton
                collapsed
                onClick={props.onClick}
            />
        </div>
    )
}

/* MARK: CollapseButton */
type CollapseButtonProps = {
    collapsed: boolean
    onClick: () => void
}

export function CollapseButton(props: CollapseButtonProps) {
    return (
        <Button
            variant='ghost'
            title={props.collapsed ? t('common.expand') : t('common.collapse')}
            classes={{ root: 'size-7 shrink-0 p-0' }}
            onClick={props.onClick}
        >
            {
                props.collapsed
                    ? (
                        <ChevronsRight
                            size={16}
                            strokeWidth={1.8}
                        />
                    )
                    : (
                        <ChevronsLeft
                            size={16}
                            strokeWidth={1.8}
                        />
                    )
            }
        </Button>
    )
}

/* MARK: PanelContent */
type PanelContentProps = {
    children: JSX.Element
    viewportRef?: (element: HTMLDivElement) => void
    classes?: {
        root?: string
        viewport?: string
        content?: string
    }
}

export function PanelContent(props: PanelContentProps) {
    return (
        <ScrollArea.Root class={mergeClasses('relative min-h-0 flex-1 overflow-hidden', props.classes?.root)}>
            <ScrollArea.Viewport
                ref={props.viewportRef}
                class={mergeClasses('scrollbar-hidden h-full w-full', props.classes?.viewport)}
            >
                <ScrollArea.Content class={mergeClasses('flex !min-w-0 flex-col gap-2 p-2 pr-3', props.classes?.content)}>
                    {props.children}
                </ScrollArea.Content>
            </ScrollArea.Viewport>
            <ScrollArea.Scrollbar
                orientation='vertical'
                class='absolute bottom-1 right-1 top-1 w-1.5 rounded-full bg-transparent'
            >
                <ScrollArea.Thumb class='rounded-full bg-scroll-thumb' />
            </ScrollArea.Scrollbar>
        </ScrollArea.Root>
    )
}
