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
    accent: 'border-blue-500/70 bg-blue-500/15 text-blue-200',
    neutral: 'border-[#29374a] bg-[#101720] text-[#9fb0c7]',
}

export function Badge(props: BadgeProps) {
    const tone = () => props.tone ?? 'neutral'
    const selectedClass = () => props.selected ? 'border-blue-500 bg-blue-500/20 text-blue-100' : toneClass[tone()]

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
