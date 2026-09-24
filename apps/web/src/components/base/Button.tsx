import { splitProps } from 'solid-js'

import { cn } from '#/lib/cn'

import type { JSX } from 'solid-js'

export type ButtonTone = 'accent' | 'danger' | 'neutral'
export type ButtonVariant = 'ghost' | 'soft' | 'solid'
type ButtonSize = 'bar'

type ButtonProps = JSX.ButtonHTMLAttributes<HTMLButtonElement> & {
    size?: ButtonSize
    tone?: ButtonTone
    variant?: ButtonVariant
    classes?: {
        root?: string
    }
}

/*
 * variant 表示視覺重量，tone 表示 semantic color；classes.root 只補尺寸與版位。
 * 真要覆蓋顏色也可以——cn() 走 twMerge，後面的會蓋掉前面的。
 */
const variantClass: Record<ButtonVariant, Record<ButtonTone, string>> = {
    ghost: {
        accent: 'bg-transparent text-accent-fg hover:bg-accent/15',
        danger: 'bg-transparent text-danger-fg hover:bg-danger/15',
        neutral: 'bg-transparent text-fg-muted hover:bg-hover hover:text-fg',
    },
    soft: {
        accent: 'bg-accent/15 text-accent-fg hover:bg-accent/25',
        danger: 'bg-danger/15 text-danger-fg hover:bg-danger/25',
        neutral: 'bg-elevated text-fg-secondary hover:bg-hover',
    },
    solid: {
        accent: 'bg-accent text-on-stage hover:bg-accent-hover',
        danger: 'bg-danger text-on-stage hover:bg-danger-hover',
        neutral: 'bg-fg-secondary text-surface hover:bg-fg',
    },
}

const toneFocusClass: Record<ButtonTone, string> = {
    accent: 'focus-visible:border-accent focus-visible:ring-accent/40',
    danger: 'focus-visible:border-danger focus-visible:ring-danger/40',
    neutral: 'focus-visible:border-accent focus-visible:ring-accent/40',
}

export function Button(props: ButtonProps) {
    const [local, rest] = splitProps(props, ['size', 'tone', 'variant', 'classes', 'class', 'type', 'children'])
    const tone = () => local.tone ?? 'neutral'
    const variant = () => local.variant ?? 'soft'

    return (
        <button
            {...rest}
            type={local.type ?? 'button'}
            class={cn(
                'flex cursor-pointer items-center justify-center gap-2 rounded-md border border-transparent px-3 py-1.5 text-xs outline-none focus-visible:border-accent focus-visible:ring-3 focus-visible:ring-accent/40',
                local.size === 'bar' && 'h-[30px] px-3 py-0 text-xs',
                variantClass[variant()][tone()],
                toneFocusClass[tone()],
                local.classes?.root,
                local.class,
            )}
        >
            {local.children}
        </button>
    )
}
