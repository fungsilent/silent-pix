import { cn } from '#/lib/cn'

type CenteredTextValue = string | number

type CenteredTextProps = {
    children: CenteredTextValue
    classes?: {
        root?: string
    }
}

export function CenteredText(props: CenteredTextProps) {
    return (
        <span class={cn('inline-grid place-items-center whitespace-nowrap leading-none', props.classes?.root)}>
            <span class='block [text-box:trim-both_cap_alphabetic]'>
                {props.children}
            </span>
        </span>
    )
}
