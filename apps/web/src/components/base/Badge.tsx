import { CenteredText } from '#/components/base/CenteredText'
import { cn } from '#/lib/cn'

export type BadgeTone =
    | 'amber'
    | 'emerald'
    | 'neutral'
    | 'rose'
    | 'sky'
    | 'slate'

type BadgeProps = {
    children: string | number
    tone?: BadgeTone | undefined
}

const toneClass: Record<BadgeTone, string> = {
    amber: 'bg-amber-500/15 text-amber-300',
    emerald: 'bg-emerald-500/15 text-emerald-300',
    neutral: 'bg-white/10 text-fg-secondary',
    rose: 'bg-rose-500/15 text-rose-300',
    sky: 'bg-sky-500/15 text-sky-300',
    slate: 'bg-slate-500/15 text-slate-300',
}

export function Badge(props: BadgeProps) {
    return (
        <CenteredText
            classes={{
                root: cn(
                    'h-5 shrink-0 rounded-md px-2 text-[0.72rem] font-medium',
                    toneClass[props.tone ?? 'neutral'],
                ),
            }}
        >
            {props.children}
        </CenteredText>
    )
}
