import { ChevronLeft, ChevronRight, Expand, Star, Trash2 } from 'lucide-solid'
import { For, onCleanup, onMount, Show } from 'solid-js'

import { Button } from '#/components/base/Button'
import { cn } from '#/lib/cn'

import type { ImageApi } from '@silent-pix/shared'

type ImageStageProps = {
    images: ImageApi.ImageResource[]
    keyboardEnabled: boolean
    selectedIndex: number
    onExpand: () => void
    onSelect: (index: number) => void
}

const glass = 'border-white/[0.09] bg-surface/75 backdrop-blur-[8px]'

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
            class='flex min-h-[240px] flex-1 flex-col overflow-hidden bg-stage'
            aria-label='Image preview'
        >
            <div class='relative flex min-h-0 flex-1 items-center justify-center overflow-hidden'>
                <Show
                    when={selectedImage()}
                    fallback={<div class='text-sm text-fg-muted'>No image</div>}
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

                <div class='absolute right-3 top-3 flex gap-2'>
                    <Button
                        variant='ghost'
                        aria-label='Expand'
                        classes={{ root: cn('size-8 rounded-md border p-0', glass) }}
                        onClick={props.onExpand}
                    >
                        <Expand
                            size={15}
                            strokeWidth={1.8}
                            aria-hidden='true'
                        />
                    </Button>
                    <Button
                        variant='ghost'
                        aria-label='Favorite'
                        classes={{ root: cn('size-8 rounded-md border p-0', glass) }}
                    >
                        <Star
                            size={15}
                            strokeWidth={1.8}
                            aria-hidden='true'
                        />
                    </Button>
                    <Button
                        variant='ghost'
                        aria-label='Delete'
                        classes={{ root: cn('size-8 rounded-md border p-0 hover:text-red-400', glass) }}
                    >
                        <Trash2
                            size={15}
                            strokeWidth={1.8}
                            aria-hidden='true'
                        />
                    </Button>
                </div>

                <Show when={hasMany()}>
                    <Button
                        variant='ghost'
                        aria-label='Previous image'
                        classes={{ root: cn('absolute left-3 top-1/2 size-9 -translate-y-1/2 rounded-md border p-0', glass) }}
                        onClick={selectPrevious}
                    >
                        <ChevronLeft
                            size={18}
                            strokeWidth={1.8}
                            aria-hidden='true'
                        />
                    </Button>
                    <Button
                        variant='ghost'
                        aria-label='Next image'
                        classes={{ root: cn('absolute right-3 top-1/2 size-9 -translate-y-1/2 rounded-md border p-0', glass) }}
                        onClick={selectNext}
                    >
                        <ChevronRight
                            size={18}
                            strokeWidth={1.8}
                            aria-hidden='true'
                        />
                    </Button>
                </Show>
            </div>

            <Show when={hasMany()}>
                <div class='relative flex h-20 shrink-0 items-center justify-center gap-2 border-t border-white/[0.07] bg-[#101010] py-2'>
                    <For each={props.images}>
                        {(image, index) => (
                            <Button
                                variant='ghost'
                                aria-label={`Show image ${index() + 1}`}
                                aria-pressed={index() === props.selectedIndex}
                                classes={{
                                    root: cn(
                                        'h-full w-auto shrink-0 overflow-hidden rounded-md p-0',
                                        index() === props.selectedIndex
                                            ? 'opacity-100 ring-2 ring-accent'
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
                    <span class='absolute right-[18px] top-1/2 -translate-y-1/2 text-xs text-fg-muted tabular-nums'>
                        {props.selectedIndex + 1} / {props.images.length}
                    </span>
                </div>
            </Show>
        </section>
    )
}
