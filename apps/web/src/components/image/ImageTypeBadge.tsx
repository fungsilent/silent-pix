import { mergeClasses } from '#/utils/style'

import type { ImageApi } from '@silent-pix/shared'

export function ImageTypeBadge(props: { type: ImageApi.ImageUsage['type'] }) {
    return (
        <span
            class={mergeClasses(
                'shrink-0 rounded px-1 py-0.5 text-[9px] font-semibold uppercase tracking-wide',
                props.type === 'input' ? 'bg-info/18 text-info-fg' : 'bg-elevated text-fg-muted',
            )}
        >
            {props.type === 'input' ? 'in' : 'out'}
        </span>
    )
}
