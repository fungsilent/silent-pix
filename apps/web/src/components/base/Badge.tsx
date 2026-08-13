import { cn } from '#/lib/cn'

import type { JSX } from 'solid-js'

type BadgeTone = 'neutral' | 'accent'

type BadgeProps = {
    children: JSX.Element
    class?: string
    selected?: boolean
    tone?: BadgeTone
}

const toneClass: Record<BadgeTone, string> = {
    accent: 'bg-accent/15 text-accent-fg',
    neutral: 'bg-elevated text-fg-secondary',
}

export function Badge(props: BadgeProps) {
    const tone = () => props.tone ?? 'neutral'
    const selectedClass = () => props.selected ? 'bg-accent/20 text-accent-fg' : toneClass[tone()]

    return (
        <div
            {...props}
            class={cn(
                'inline-flex h-5 shrink-0 items-center justify-center rounded-md px-2 text-[0.72rem] font-medium leading-none',
                props.class ?? selectedClass(),
            )}
            aria-pressed={props.selected}
        >
            {props.children}
        </div>
    )
}
