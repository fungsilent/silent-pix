import type { JSX } from 'solid-js'

type SectionTitleProps = {
    children: JSX.Element
    count?: number | undefined
}

export function SectionTitle(props: SectionTitleProps) {
    return (
        <h3 class='m-0 flex items-center gap-1.5 text-[11px] font-semibold uppercase leading-none tracking-[0.08em] text-fg-title'>
            {props.children}
            {props.count !== undefined && (
                <span class='font-normal text-fg-muted'>{props.count}</span>
            )}
        </h3>
    )
}
