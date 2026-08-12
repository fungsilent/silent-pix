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
                'flex items-center justify-center gap-2 rounded-md border border-line bg-elevated p-2 text-fg-secondary cursor-pointer hover:bg-hover',
                props.classes?.root,
            )}
            disabled={props.disabled}
            onClick={props.onClick}
        >
            {props.children}
        </button>
    )
}
