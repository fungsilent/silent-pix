import { ChevronLeft, ChevronRight, X } from 'lucide-solid'
import { For, onCleanup, onMount, Show } from 'solid-js'
import { Portal } from 'solid-js/web'

import { resolveImageUrl } from '#/api/image'
import { Button } from '#/components/base/Button'
import { CenteredText } from '#/components/base/CenteredText'
import { ZoomControls } from '#/components/viewer/ZoomControls'
import { ZoomStage } from '#/components/viewer/ZoomStage'
import { cn } from '#/lib/cn'
import { createImageZoom } from '#/lib/imageZoom'
import { overlayRoot } from '#/lib/overlayRoot'
import { overlayStore } from '#/store/overlay'

import type { ViewerImage } from '#/components/viewer/ZoomStage'
import type { OverlayId } from '#/store/overlay'
import type { JSX } from 'solid-js'

type ImageViewerReview = {
    controls: JSX.Element
}

type ImageViewerProps = {
    images: ViewerImage[]
    selectedIndex: number
    onClose: () => void
    onSelect: (index: number) => void
    review?: ImageViewerReview
    status?: JSX.Element
}

const glass = 'border-stage-line bg-stage-control text-on-stage hover:bg-stage-control-hover backdrop-blur-[8px]'

export function ImageViewer(props: ImageViewerProps) {
    const zoom = createImageZoom()
    const hasMany = () => props.images.length > 1
    let overlayId: OverlayId | undefined

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

    const thumbnails = () => (
        <For each={props.images}>
            {(thumbnail, index) => (
                <Button
                    variant='ghost'
                    classes={{
                        root: cn(
                            'relative h-full w-auto shrink-0 overflow-hidden rounded-md p-0',
                            index() === props.selectedIndex
                                ? 'opacity-100 ring-2 ring-on-stage'
                                : 'opacity-60 hover:opacity-100',
                        ),
                    }}
                    onClick={() => select(index())}
                >
                    <img
                        class='h-full w-auto object-contain'
                        src={resolveImageUrl(thumbnail.url)}
                        alt=''
                    />
                </Button>
            )}
        </For>
    )

    const closeOnBackdrop = (event: MouseEvent) => {
        if (zoom.consumeDrag()) {
            return
        }

        if (event.target === event.currentTarget) {
            props.onClose()
        }
    }

    const handleKeyDown = (event: KeyboardEvent) => {
        if (event.defaultPrevented || !overlayId || !overlayStore.isTop(overlayId)) {
            return
        }

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
        overlayId = overlayStore.open()
        window.addEventListener('keydown', handleKeyDown)
    })

    onCleanup(() => {
        if (overlayId) {
            overlayStore.close(overlayId)
        }
        window.removeEventListener('keydown', handleKeyDown)
    })

    return (
        <Portal mount={overlayRoot()}>
            <div
                class='backdrop pointer-events-auto absolute inset-0 z-50 flex select-none flex-col items-center justify-center bg-backdrop backdrop-blur-[6px]'
                onClick={closeOnBackdrop}
            >
                <Show when={hasMany()}>
                    <CenteredText
                        classes={{
                            root: cn('absolute left-6 top-6 z-10 rounded-md border px-2.5 py-1 text-xs text-fg-secondary tabular-nums', glass),
                        }}
                    >
                        {`${props.selectedIndex + 1} / ${props.images.length}`}
                    </CenteredText>
                </Show>

                <div class='absolute right-6 top-6 z-10 flex items-center gap-2'>
                    <Button
                        variant='ghost'
                        classes={{ root: cn('size-8 rounded-md border p-0', glass) }}
                        onClick={() => props.onClose()}
                    >
                        <X
                            size={16}
                            strokeWidth={1.8}
                        />
                    </Button>
                </div>

                <Show when={hasMany()}>
                    <Button
                        variant='ghost'
                        classes={{ root: cn('absolute left-6 top-1/2 z-10 size-8 -translate-y-1/2 rounded-md border p-0', glass) }}
                        onClick={selectPrevious}
                    >
                        <ChevronLeft
                            size={20}
                            strokeWidth={1.8}
                        />
                    </Button>
                    <Button
                        variant='ghost'
                        classes={{ root: cn('absolute right-6 top-1/2 z-10 size-8 -translate-y-1/2 rounded-md border p-0', glass) }}
                        onClick={selectNext}
                    >
                        <ChevronRight
                            size={20}
                            strokeWidth={1.8}
                        />
                    </Button>
                </Show>

                <Show
                    when={!props.status}
                    fallback={(
                        <div class='flex min-h-0 w-full flex-1 items-center justify-center px-4'>
                            {props.status}
                        </div>
                    )}
                >
                    <ZoomStage
                        images={props.images}
                        selectedIndex={props.selectedIndex}
                        zoom={zoom}
                        onClick={closeOnBackdrop}
                        onBackdrop
                    />

                    <Show
                        when={props.review}
                        fallback={(
                            <Show when={hasMany() && zoom.isFit()}>
                                <div class='flex h-20 shrink-0 items-center justify-center gap-2 py-2'>
                                    {thumbnails()}
                                </div>
                            </Show>
                        )}
                    >
                        {review => (
                            <div class='absolute bottom-3 left-1/2 z-10 flex -translate-x-1/2 flex-col items-center gap-2 pt-6 opacity-0 transition-opacity hover:opacity-100 focus-within:opacity-100'>
                                {review().controls}
                                <Show when={hasMany()}>
                                    <div class={cn('flex h-20 items-center justify-center gap-2 rounded-lg border p-2', glass)}>
                                        {thumbnails()}
                                    </div>
                                </Show>
                            </div>
                        )}
                    </Show>

                    <ZoomControls zoom={zoom} />
                </Show>
            </div>
        </Portal>
    )
}
