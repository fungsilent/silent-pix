import type { JSX } from 'solid-js'

type LabelProps = {
    children: JSX.Element
    label: string
    tone?: 'neutral' | 'online'
}

export function Label(props: LabelProps) {
    return (
        <div
            class='flex items-center justify-center gap-2 p-2 overflow-hidden text-ellipsis whitespace-nowrap rounded-md border border-[#263241] text-[0.78rem] text-[#9fb0c7]'
            aria-label={props.label}
        >
            {props.children}
        </div>
    )
}
