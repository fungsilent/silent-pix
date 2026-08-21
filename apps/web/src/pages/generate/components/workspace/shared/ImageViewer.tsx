import { ChevronLeft, ChevronRight, Star, Trash2, X } from 'lucide-solid'
import { For, onCleanup, onMount, Show } from 'solid-js'
import { Portal } from 'solid-js/web'

import { Button } from '#/components/base/Button'
import { cn } from '#/lib/cn'
import { createImageZoom } from '#/lib/imageZoom'
import { ZoomControls } from '#/pages/generate/components/workspace/shared/ZoomControls'
import { ZoomStage } from '#/pages/generate/components/workspace/shared/ZoomStage'
import { workspaceStore } from '#/store/workspace'

import type { ViewerImage } from '#/store/workspace'
import type { JSX } from 'solid-js'

type ImageViewerProps = {
    images: ViewerImage[]
    selectedIndex: number
    onClose: () => void
    onSelect: (index: number) => void
    actions?: JSX.Element | null
}

const glass = 'border-white/[0.09] bg-surface/75 backdrop-blur-[8px]'

export function ImageViewer(props: ImageViewerProps) {
    const zoom = createImageZoom()
    const hasMany = () => props.images.length > 1

    const select = (index: number) => {
        props.onSelect(index)
    }

    const selectPrevious = () => {
        if (!hasMany()) return
        select((props.selectedIndex - 1 + props.images.length) % props.images.length)
    }

    const selectNext = () => {
        if (!hasMany()) return
        select((props.selectedIndex + 1) % props.images.length)
    }

    const closeOnBackdrop = (event: MouseEvent) => {
        if (zoom.consumeDrag()) {
            return
        }

        if (event.target === event.currentTarget) {
            props.onClose()
        }
    }

    const handleKeyDown = (event: KeyboardEvent) => {
        if (event.key === 'Escape') {
            event.preventDefault()
            props.onClose()
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
        workspaceStore.openModal()
        window.addEventListener('keydown', handleKeyDown)
    })

    onCleanup(() => {
        workspaceStore.closeModal()
        window.removeEventListener('keydown', handleKeyDown)
    })

    return (
        <Portal>
            <div
                class='viewer-overlay fixed inset-0 z-50 flex select-none flex-col items-center justify-center bg-[rgb(5_5_5/0.72)] backdrop-blur-[6px]'
                role='dialog'
                aria-modal='true'
                aria-label='Image viewer'
                onClick={closeOnBackdrop}
            >
                <Show when={hasMany()}>
                    <span class={cn('absolute left-6 top-6 z-10 rounded-md border px-2.5 py-1 text-xs text-fg-secondary tabular-nums', glass)}>
                        {props.selectedIndex + 1} / {props.images.length}
                    </span>
                </Show>

                <div class='absolute right-6 top-6 z-10 flex items-center gap-2'>
                    <Show when={props.actions !== null}>
                        {props.actions ?? (
                            <>
                                <Button
                                    variant='ghost'
                                    aria-label='Favorite'
                                    classes={{ root: cn('size-9 rounded-md border p-0', glass) }}
                                >
                                    <Star
                                        size={16}
                                        strokeWidth={1.8}
                                        aria-hidden='true'
                                    />
                                </Button>
                                <Button
                                    variant='ghost'
                                    aria-label='Delete'
                                    classes={{ root: cn('size-9 rounded-md border p-0 hover:text-red-400', glass) }}
                                >
                                    <Trash2
                                        size={16}
                                        strokeWidth={1.8}
                                        aria-hidden='true'
                                    />
                                </Button>
                            </>
                        )}
                    </Show>
                    <Button
                        variant='ghost'
                        aria-label='Close viewer'
                        classes={{ root: cn('ml-1 size-9 rounded-md border p-0', glass) }}
                        onClick={() => props.onClose()}
                    >
                        <X
                            size={16}
                            strokeWidth={1.8}
                            aria-hidden='true'
                        />
                    </Button>
                </div>

                <Show when={hasMany()}>
                    <Button
                        variant='ghost'
                        aria-label='Previous image'
                        classes={{ root: cn('absolute left-6 top-1/2 z-10 size-10 -translate-y-1/2 rounded-md border p-0', glass) }}
                        onClick={selectPrevious}
                    >
                        <ChevronLeft
                            size={20}
                            strokeWidth={1.8}
                            aria-hidden='true'
                        />
                    </Button>
                    <Button
                        variant='ghost'
                        aria-label='Next image'
                        classes={{ root: cn('absolute right-6 top-1/2 z-10 size-10 -translate-y-1/2 rounded-md border p-0', glass) }}
                        onClick={selectNext}
                    >
                        <ChevronRight
                            size={20}
                            strokeWidth={1.8}
                            aria-hidden='true'
                        />
                    </Button>
                </Show>

                <ZoomStage
                    images={props.images}
                    selectedIndex={props.selectedIndex}
                    zoom={zoom}
                    onClick={closeOnBackdrop}
                />

                <Show when={hasMany() && zoom.isFit()}>
                    <div class='flex h-20 shrink-0 items-center justify-center gap-2 py-2'>
                        <For each={props.images}>
                            {(thumbnail, index) => (
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
                                    onClick={() => select(index())}
                                >
                                    <img
                                        class='h-full w-auto object-contain'
                                        src={thumbnail.url}
                                        alt=''
                                    />
                                </Button>
                            )}
                        </For>
                    </div>
                </Show>

                <ZoomControls zoom={zoom} />
            </div>
        </Portal>
    )
}
