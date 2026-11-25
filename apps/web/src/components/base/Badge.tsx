import { CenteredText } from '#/components/base/CenteredText'
import { mergeClasses } from '#/utils/style'

export type BadgeTone =
    | 'danger'
    | 'info'
    | 'neutral'
    | 'success'
    | 'warning'

type BadgeProps = {
    children: string | number
    tone?: BadgeTone | undefined
}

const toneClass: Record<BadgeTone, string> = {
    danger: 'bg-danger-soft text-danger-fg',
    info: 'bg-info-soft text-info-fg',
    neutral: 'bg-line text-fg-secondary',
    success: 'bg-success-soft text-success-fg',
    warning: 'bg-warning-soft text-warning-fg',
}

export function Badge(props: BadgeProps) {
    return (
        <CenteredText
            classes={{
                root: mergeClasses(
                    'h-5 shrink-0 rounded-md px-2 text-[0.72rem] font-medium',
                    toneClass[props.tone ?? 'neutral'],
                ),
            }}
        >
            {props.children}
        </CenteredText>
    )
}
