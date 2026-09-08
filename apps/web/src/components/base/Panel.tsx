import { ScrollArea } from '@ark-ui/solid'
import { ChevronsLeft, ChevronsRight } from 'lucide-solid'
import { createSignal } from 'solid-js'

import { Button } from '#/components/base/Button'
import { cn } from '#/lib/cn'

import type { Accessor, JSX } from 'solid-js'

/* MARK: Panel */
type PanelRenderState = {
    collapse: () => void
    expand: () => void
    isCollapsed: Accessor<boolean>
    toggle: () => void
}

type PanelProps = {
    children: JSX.Element | ((state: PanelRenderState) => JSX.Element)
    defaultCollapsed?: boolean
    classes?: {
        root?: string
        open?: string
        close?: string
    }
}

export function Panel(props: PanelProps) {
    const [isCollapsed, setIsCollapsed] = createSignal(props.defaultCollapsed ?? false)

    const state: PanelRenderState = {
        collapse: () => {
            setIsCollapsed(true)
        },
        expand: () => {
            setIsCollapsed(false)
        },
        isCollapsed,
        toggle: () => {
            setIsCollapsed(value => !value)
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
            class={cn(
                'flex-none overflow-hidden bg-surface',
                props.classes?.root,
                isCollapsed() ? props.classes?.close : props.classes?.open,
            )}
        >
            {render(props.children)}
        </aside>
    )
}

/* MARK: Panel */
type PanelHeaderProps = {
    title?: string
    action?: JSX.Element
    classes?: {
        root?: string
        title?: string
    }
}

export function PanelHeader(props: PanelHeaderProps) {
    return (
        <div class={cn('flex h-12 flex-none items-center justify-between gap-2 px-2', props.classes?.root)}>
            <h2 class={cn('m-0 truncate text-[13px] font-semibold leading-none text-fg', props.classes?.title)}>
                {props.title}
            </h2>
            {props.action}
        </div>
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
            classes={{ root: 'size-8 shrink-0 p-0' }}
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
    classes?: {
        root?: string
        viewport?: string
        content?: string
    }
}

export function PanelContent(props: PanelContentProps) {
    return (
        <ScrollArea.Root class={cn('relative min-h-0 flex-1 overflow-hidden', props.classes?.root)}>
            <ScrollArea.Viewport class={cn('scrollbar-hidden h-full w-full', props.classes?.viewport)}>
                <ScrollArea.Content class={cn('flex !min-w-0 flex-col gap-2 p-2 pr-3', props.classes?.content)}>
                    {props.children}
                </ScrollArea.Content>
            </ScrollArea.Viewport>
            <ScrollArea.Scrollbar
                orientation='vertical'
                class='absolute bottom-1 right-1 top-1 w-1.5 rounded-full bg-transparent'
            >
                <ScrollArea.Thumb class='rounded-full bg-white/10' />
            </ScrollArea.Scrollbar>
        </ScrollArea.Root>
    )
}
