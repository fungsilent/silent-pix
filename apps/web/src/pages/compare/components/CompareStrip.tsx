import { EyeOff, ImageOff, X } from 'lucide-solid'
import { For, Show } from 'solid-js'

import { Button } from '#/components/base/Button'
import { resolveImageUrl } from '#/data/image/image.api'
import { mergeClasses } from '#/utils/style'

import type { CompareEntry } from '#/pages/compare/state/session'

type CompareThumbnailStripProps = {
    entries: CompareEntry[]
    failedImageIds: Set<string>
    selectedId: string | null
    onImageError: (imageId: string) => void
    onRemove: (imageId: string) => void
    onSelect: (imageId: string) => void
    onToggleHidden: (imageId: string) => void
}

export function CompareThumbnailStrip(props: CompareThumbnailStripProps) {
    const corner = 'absolute top-1 z-10 h-[18px] min-w-[18px] rounded border-0 px-1 py-0 text-[10px] font-bold leading-none tabular-nums backdrop-blur-[3px]'

    return (
        <div class='flex h-20 shrink-0 items-center justify-center-safe gap-2 overflow-x-auto border-t border-stage-line-subtle bg-stage-strip px-3 py-2'>
            <For each={props.entries}>
                {(entry, index) => {
                    const selected = () => entry.image.id === props.selectedId

                    return (
                        <div class='group relative flex h-full w-auto shrink-0'>
                            <Button
                                variant='ghost'
                                classes={{
                                    root: mergeClasses(
                                        'relative h-full w-auto shrink-0 overflow-hidden rounded-md p-0',
                                        selected() && 'ring-2 ring-stage-fg',
                                    ),
                                }}
                                onClick={() => props.onSelect(entry.image.id)}
                            >
                                <img
                                    class={mergeClasses('h-full w-auto object-contain', entry.hidden && 'opacity-40 grayscale')}
                                    src={resolveImageUrl(entry.image.url)}
                                    alt=''
                                    onError={() => props.onImageError(entry.image.id)}
                                />
                                <Show when={props.failedImageIds.has(entry.image.id)}>
                                    <span class='absolute inset-0 grid place-items-center bg-stage-control text-stage-overlay-text'>
                                        <ImageOff
                                            size={16}
                                            strokeWidth={1.8}
                                        />
                                    </span>
                                </Show>
                            </Button>
                            <Button
                                variant='ghost'
                                classes={{
                                    root: mergeClasses(
                                        corner,
                                        'left-1 group-hover:bg-stage-control-hover group-hover:text-on-stage group-hover:ring-0',
                                        selected() ? 'bg-accent text-on-stage hover:bg-accent' : 'bg-stage-overlay text-stage-overlay-label ring-1 ring-stage-ring hover:bg-stage-overlay',
                                        selected() && 'touch:bg-stage-control-hover',
                                        !selected() && !entry.hidden && 'touch:pointer-events-none',
                                    ),
                                }}
                                onClick={() => props.onToggleHidden(entry.image.id)}
                            >
                                <Show when={!entry.hidden}>
                                    <span class={mergeClasses('group-hover:hidden', selected() && 'touch:hidden')}>{index() + 1}</span>
                                </Show>
                                <EyeOff
                                    class={entry.hidden ? '' : mergeClasses('hidden group-hover:block', selected() && 'touch:block')}
                                    size={11}
                                    strokeWidth={1.8}
                                />
                            </Button>
                            <Button
                                variant='ghost'
                                classes={{ root: mergeClasses(corner, 'right-1 size-[18px] bg-stage-control-hover p-0 text-on-stage opacity-0 group-hover:opacity-100 focus-visible:opacity-100 hover:bg-stage-control-hover hover:text-stage-danger', selected() ? 'touch:opacity-100' : 'touch:hidden') }}
                                onClick={() => props.onRemove(entry.image.id)}
                            >
                                <X
                                    size={11}
                                    strokeWidth={1.8}
                                />
                            </Button>
                        </div>
                    )
                }}
            </For>
        </div>
    )
}
