import { splitProps } from 'solid-js'

import { cn } from '#/lib/cn'

import type { JSX } from 'solid-js'

type ButtonVariant = 'accent' | 'default' | 'ghost' | 'primary'

type ButtonProps = JSX.ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: ButtonVariant
    classes?: {
        root?: string
    }
}

/*
 * 顏色由 variant 決定，classes.root 只補尺寸與版位。
 * 真要覆蓋顏色也可以——cn() 走 twMerge，後面的會蓋掉前面的。
 */
const variantClass: Record<ButtonVariant, string> = {
    accent: 'bg-accent/15 text-accent-fg hover:bg-accent/25',
    default: 'bg-elevated text-fg-secondary hover:bg-hover',
    ghost: 'bg-transparent text-fg-muted hover:bg-hover hover:text-fg',
    primary: 'bg-accent text-white hover:bg-accent-hover',
}

export function Button(props: ButtonProps) {
    const [local, rest] = splitProps(props, ['variant', 'classes', 'class', 'type', 'children'])

    return (
        <button
            {...rest}
            type={local.type ?? 'button'}
            class={cn(
                'flex cursor-pointer items-center justify-center gap-2 rounded-md border border-transparent p-2 outline-none focus-visible:border-accent focus-visible:ring-3 focus-visible:ring-accent/40',
                variantClass[local.variant ?? 'default'],
                local.classes?.root,
                local.class,
            )}
        >
            {local.children}
        </button>
    )
}
