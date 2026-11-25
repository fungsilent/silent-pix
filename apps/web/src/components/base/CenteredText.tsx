import { mergeClasses } from '#/utils/style'

type CenteredTextValue = string | number

type CenteredTextProps = {
    children: CenteredTextValue
    classes?: {
        root?: string
    }
}

export function CenteredText(props: CenteredTextProps) {
    return (
        <span class={mergeClasses('inline-grid place-items-center whitespace-nowrap leading-none', props.classes?.root)}>
            <span class='block [text-box:trim-both_cap_alphabetic]'>
                {props.children}
            </span>
        </span>
    )
}
