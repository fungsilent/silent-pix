import { cn } from '#/lib/cn'

import type { JSX } from 'solid-js'

type BarClasses = {
    root?: string
}

type BarRootProps = {
    children: JSX.Element
    class?: string
    classes?: BarClasses
}

function BarRoot(props: BarRootProps) {
    return (
        <div class={cn('flex h-12 shrink-0 items-center gap-3 bg-surface px-4', props.classes?.root, props.class)}>
            {props.children}
        </div>
    )
}

type BarGroupProps = BarRootProps

function BarGroup(props: BarGroupProps) {
    return (
        <div class={cn('flex min-w-0 items-center gap-2', props.classes?.root, props.class)}>
            {props.children}
        </div>
    )
}

type BarTitleProps = BarRootProps

function BarTitle(props: BarTitleProps) {
    return (
        <h2 class={cn('m-0 min-w-0 truncate text-[13px] font-semibold leading-none text-fg', props.classes?.root, props.class)}>
            {props.children}
        </h2>
    )
}

type BarMetaProps = BarRootProps

function BarMeta(props: BarMetaProps) {
    return (
        <span class={cn('min-w-0 truncate text-[11.5px] leading-none text-fg-muted', props.classes?.root, props.class)}>
            {props.children}
        </span>
    )
}

type BarActionsProps = BarRootProps

function BarActions(props: BarActionsProps) {
    return (
        <div class={cn('ml-auto flex min-w-0 items-center gap-2', props.classes?.root, props.class)}>
            {props.children}
        </div>
    )
}

export const Bar = {
    Actions: BarActions,
    Group: BarGroup,
    Meta: BarMeta,
    Root: BarRoot,
    Title: BarTitle,
}
