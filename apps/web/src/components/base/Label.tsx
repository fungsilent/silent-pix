import type { JSX } from 'solid-js'

type LabelProps = {
    children: JSX.Element
    label: string
    tone?: 'neutral' | 'online'
}

export function Label(props: LabelProps) {
    return (
        <div
            class='flex items-center justify-center gap-2 p-2 overflow-hidden text-ellipsis whitespace-nowrap rounded-md border border-line text-[0.78rem] text-fg-secondary'
            aria-label={props.label}
        >
            {props.children}
        </div>
    )
}
