import { clsx } from 'clsx'

import type { JSX } from 'solid-js'

type ButtonProps = {
    children: JSX.Element
    disabled?: boolean | undefined
    onClick?: (() => void) | undefined
    type?: JSX.ButtonHTMLAttributes<HTMLButtonElement>['type']
    classes?: {
        root?: string
    }
}

export function Button(props: ButtonProps) {
    return (
        <button
            type={props.type ?? 'button'}
            class={clsx(
                'flex items-center justify-center gap-2 rounded-md border border-[#29374a] bg-[#111821] p-2 text-[#c7d2e4] cursor-pointer',
                props.classes?.root,
            )}
            disabled={props.disabled}
            onClick={props.onClick}
        >
            {props.children}
        </button>
    )
}
