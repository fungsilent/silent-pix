import { ChevronLeft, ChevronRight, Columns2, Expand, ImagePlus, Star, Trash2 } from 'lucide-solid'
import { For, onCleanup, onMount, Show } from 'solid-js'

import { Button } from '#/components/base/Button'
import { Loading } from '#/components/base/Loading'
import { cn } from '#/lib/cn'

import type { ImageApi } from '@silent-pix/shared'

type ImageStageProps = {
    images: ImageApi.ImageResource[]
    keyboardEnabled: boolean
    loading: boolean
    selectedIndex: number
    onCompare: (image: ImageApi.ImageResource) => void
    onExpand: () => void
    onSelect: (index: number) => void
    onUseAsReference: (image: ImageApi.ImageResource) => void
}

const glass = 'border-stage-line bg-stage-control text-on-stage hover:bg-stage-control-hover backdrop-blur-[8px]'

export function ImageStage(props: ImageStageProps) {
    const selectedImage = () => props.images[props.selectedIndex] ?? props.images[0]
    const hasMany = () => props.images.length > 1

    const selectPrevious = () => {
        if (props.images.length === 0) {
            return
        }

        props.onSelect((props.selectedIndex - 1 + props.images.length) % props.images.length)
    }
    const selectNext = () => {
        if (props.images.length === 0) {
            return
        }

        props.onSelect((props.selectedIndex + 1) % props.images.length)
    }

    const isEditableTarget = (target: EventTarget | null) => {
        if (!(target instanceof HTMLElement)) {
            return false
        }

        return target.isContentEditable
            || target.tagName === 'INPUT'
            || target.tagName === 'TEXTAREA'
            || target.tagName === 'SELECT'
    }

    const handleKeyDown = (event: KeyboardEvent) => {
        if (!props.keyboardEnabled || props.images.length < 2 || isEditableTarget(event.target)) {
            return
        }

        if (event.key === 'ArrowLeft') {
            event.preventDefault()
            selectPrevious()
            return
        }

        if (event.key === 'ArrowRight') {
            event.preventDefault()
            selectNext()
        }
    }

    onMount(() => {
        window.addEventListener('keydown', handleKeyDown)
    })

    onCleanup(() => {
        window.removeEventListener('keydown', handleKeyDown)
    })

    return (
        <section
            class={cn(
                'relative flex min-h-[240px] flex-1 flex-col overflow-hidden',
                selectedImage() ? 'bg-stage' : 'bg-stage-empty',
            )}
            inert={props.loading}
        >
            <div class='relative flex min-h-0 flex-1 items-center justify-center overflow-hidden'>
                <Show
                    when={selectedImage()}
                    /* loading 時還不知道有沒有圖，不能說 No image；stage 留黑 */
                    fallback={<Show when={!props.loading}><div class='text-sm text-fg-muted'>No image</div></Show>}
                >
                    {image => (
                        <img
                            class='h-full w-full object-contain'
                            src={image().url}
                            alt='Selected generated preview'
                            onClick={props.onExpand}
                        />
                    )}
                </Show>

                <Loading.Hide
                    class='absolute right-3 top-3 flex gap-2'
                    loading={() => props.loading}
                >
                    <Button
                        variant='ghost'
                        classes={{ root: cn('size-8 rounded-md border p-0', glass) }}
                        onClick={props.onExpand}
                    >
                        <Expand
                            size={15}
                            strokeWidth={1.8}
                        />
                    </Button>
                    <Button
                        variant='ghost'
                        classes={{ root: cn('size-8 rounded-md border p-0', glass) }}
                        onClick={() => {
                            const image = selectedImage()
                            if (image) {
                                props.onCompare(image)
                            }
                        }}
                    >
                        <Columns2
                            size={15}
                            strokeWidth={1.8}
                        />
                    </Button>
                    {/* 緊迫迴圈：剛生完一批，挑一張直接接著改，不必開 dialog */}
                    <Button
                        variant='ghost'
                        classes={{ root: cn('size-8 rounded-md border p-0', glass) }}
                        onClick={() => {
                            const image = selectedImage()
                            if (image) {
                                props.onUseAsReference(image)
                            }
                        }}
                    >
                        <ImagePlus
                            size={15}
                            strokeWidth={1.8}
                        />
                    </Button>
                    <Button
                        variant='ghost'
                        classes={{ root: cn('size-8 rounded-md border p-0', glass) }}
                    >
                        <Star
                            size={15}
                            strokeWidth={1.8}
                        />
                    </Button>
                    <Button
                        variant='ghost'
                        classes={{ root: cn('size-8 rounded-md border p-0 hover:text-stage-danger', glass) }}
                    >
                        <Trash2
                            size={15}
                            strokeWidth={1.8}
                        />
                    </Button>
                </Loading.Hide>

                <Show when={hasMany()}>
                    <Button
                        variant='ghost'
                        classes={{ root: cn('absolute left-3 top-1/2 size-9 -translate-y-1/2 rounded-md border p-0', glass) }}
                        onClick={selectPrevious}
                    >
                        <ChevronLeft
                            size={18}
                            strokeWidth={1.8}
                        />
                    </Button>
                    <Button
                        variant='ghost'
                        classes={{ root: cn('absolute right-3 top-1/2 size-9 -translate-y-1/2 rounded-md border p-0', glass) }}
                        onClick={selectNext}
                    >
                        <ChevronRight
                            size={18}
                            strokeWidth={1.8}
                        />
                    </Button>
                </Show>
            </div>

            <Show when={hasMany()}>
                <div class='relative flex h-20 shrink-0 items-center justify-center gap-2 border-t border-stage-line-subtle bg-stage-strip py-2'>
                    <For each={props.images}>
                        {(image, index) => (
                            <Button
                                variant='ghost'
                                classes={{
                                    root: cn(
                                        'h-full w-auto shrink-0 overflow-hidden rounded-md p-0',
                                        index() === props.selectedIndex
                                            ? 'opacity-100 ring-2 ring-stage-fg'
                                            : 'opacity-60 hover:opacity-100',
                                    ),
                                }}
                                onClick={() => props.onSelect(index())}
                            >
                                <img
                                    class='h-full w-auto object-contain'
                                    src={image.url}
                                    alt=''
                                />
                            </Button>
                        )}
                    </For>
                    <span class='absolute right-[18px] top-1/2 -translate-y-1/2 text-xs text-stage-fg/75 tabular-nums'>
                        {props.selectedIndex + 1} / {props.images.length}
                    </span>
                </div>
            </Show>
        </section>
    )
}
