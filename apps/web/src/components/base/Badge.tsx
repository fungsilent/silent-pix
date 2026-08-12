import clsx from 'clsx'

import type { JSX } from 'solid-js'

type BadgeTone = 'neutral' | 'accent'

type BadgeProps = {
    children: JSX.Element
    class?: string
    selected?: boolean
    tone?: BadgeTone
}

const toneClass: Record<BadgeTone, string> = {
    accent: 'border-accent/70 bg-accent/15 text-accent-fg',
    neutral: 'border-line bg-elevated text-fg-secondary',
}

export function Badge(props: BadgeProps) {
    const tone = () => props.tone ?? 'neutral'
    const selectedClass = () => props.selected ? 'border-accent bg-accent/20 text-accent-fg' : toneClass[tone()]

    return (
        <div
            {...props}
            class={clsx(
                'inline-flex shrink-0 items-center justify-center rounded-md border px-2 py-1 text-[0.72rem] font-medium leading-none',
                selectedClass() && props.class
            )}
            aria-pressed={props.selected}
        >
            {props.children}
        </div>
    )
}
