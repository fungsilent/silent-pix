import { ChevronLeft, ChevronRight, Minus, Plus, Star, Trash2, X } from 'lucide-solid'
import { createSignal, For, onCleanup, onMount, Show } from 'solid-js'
import { Portal } from 'solid-js/web'

import { Button } from '#/components/base/Button'
import { cn } from '#/lib/cn'
import { createImageZoom } from '#/lib/imageZoom'

import type { Offset, Size } from '#/lib/imageZoom'

type ImageViewerProps = {
    images: string[]
    selectedIndex: number
    onClose: () => void
    onSelect: (index: number) => void
}

const glass = 'border-white/[0.09] bg-surface/75 backdrop-blur-[8px]'

export function ImageViewer(props: ImageViewerProps) {
    const zoom = createImageZoom()
    const [editingZoom, setEditingZoom] = createSignal(false)

    const image = () => props.images[props.selectedIndex] ?? props.images[0]
    const hasMany = () => props.images.length > 1

    const select = (index: number) => {
        zoom.reset()
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

    /*
     * 圖片周圍的空白同樣算背景，放大時也一樣關得掉；只有剛拖曳過的那一次放手不算，
     * 否則平移結束就會誤關。只認元素本身，點在圖片、縮圖或控制項上都不會冒進來。
     */
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
        window.addEventListener('keydown', handleKeyDown)
    })

    onCleanup(() => {
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

                <div
                    ref={zoom.setViewportRef}
                    class='relative flex min-h-0 w-full flex-1 items-center justify-center overflow-hidden'
                    onClick={closeOnBackdrop}
                    onDblClick={event => {
                        // 不讓瀏覽器把雙擊當成選字
                        event.preventDefault()
                        zoom.toggleActualSize()
                    }}
                    onWheel={zoom.onWheel}
                >
                    <Show when={image()}>
                        {source => (
                            <img
                                class={cn(
                                    'viewer-image max-w-none select-none',
                                    zoom.overflows()
                                        ? (zoom.dragging() ? 'cursor-grabbing' : 'cursor-grab')
                                        : 'cursor-default',
                                )}
                                style={{
                                    height: zoom.scaled().height ? `${zoom.scaled().height}px` : 'auto',
                                    translate: `${zoom.offset().x}px ${zoom.offset().y}px`,
                                    width: zoom.scaled().width ? `${zoom.scaled().width}px` : 'auto',
                                }}
                                src={source()}
                                alt='Generated preview'
                                draggable={false}
                                /* 平移掛在圖片上：捕獲若設在 viewport，放大時的 click 會被改派給 viewport，誤判成點背景 */
                                onPointerCancel={zoom.endDrag}
                                onPointerDown={zoom.onPointerDown}
                                onPointerMove={zoom.onPointerMove}
                                onPointerUp={zoom.endDrag}
                                onLoad={event => {
                                    zoom.setNatural({
                                        height: event.currentTarget.naturalHeight,
                                        width: event.currentTarget.naturalWidth,
                                    })
                                }}
                            />
                        )}
                    </Show>

                    <Show when={zoom.overflows() && image()}>
                        {source => (
                            <Minimap
                                offset={zoom.offset()}
                                scaled={zoom.scaled()}
                                source={source()}
                                viewport={zoom.viewport()}
                                onMove={zoom.moveTo}
                            />
                        )}
                    </Show>
                </div>

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
                                        src={thumbnail}
                                        alt=''
                                    />
                                </Button>
                            )}
                        </For>
                    </div>
                </Show>

                <div class={cn('absolute bottom-6 left-6 z-10 flex h-9 items-center gap-1 rounded-md border px-1', glass)}>
                    <Button
                        variant='ghost'
                        aria-label='Zoom out'
                        disabled={!zoom.canZoomOut()}
                        classes={{ root: 'size-7 rounded p-0 disabled:opacity-30' }}
                        onClick={zoom.zoomOut}
                    >
                        <Minus
                            size={15}
                            strokeWidth={1.8}
                            aria-hidden='true'
                        />
                    </Button>

                    <Show
                        when={editingZoom()}
                        fallback={(
                            <Button
                                variant='ghost'
                                aria-label='Zoom level, click to type a value'
                                classes={{
                                    root: cn(
                                        'w-[54px] rounded p-0 tabular-nums',
                                        !zoom.isFit() && 'text-fg',
                                    ),
                                }}
                                onClick={() => setEditingZoom(true)}
                            >
                                {zoom.isFit() ? 'Fit' : `${Math.round(zoom.percent())}%`}
                            </Button>
                        )}
                    >
                        <input
                            class='h-7 w-[54px] rounded bg-active text-center text-xs tabular-nums text-fg outline-none'
                            type='text'
                            autofocus
                            value={Math.round(zoom.percent())}
                            onBlur={() => setEditingZoom(false)}
                            onChange={event => {
                                const value = Number(event.currentTarget.value.replace('%', ''))
                                if (Number.isFinite(value) && value > 0) {
                                    zoom.requestPercent(value)
                                }
                                setEditingZoom(false)
                            }}
                            onKeyDown={event => {
                                if (event.key === 'Escape') setEditingZoom(false)
                            }}
                        />
                    </Show>

                    <Button
                        variant='ghost'
                        aria-label='Zoom in'
                        disabled={!zoom.canZoomIn()}
                        classes={{ root: 'size-7 rounded p-0 disabled:opacity-30' }}
                        onClick={zoom.zoomIn}
                    >
                        <Plus
                            size={15}
                            strokeWidth={1.8}
                            aria-hidden='true'
                        />
                    </Button>

                    <span
                        class='mx-1 h-[18px] w-px bg-white/10'
                        aria-hidden='true'
                    />

                    <Button
                        variant='ghost'
                        aria-label='Actual size'
                        classes={{ root: 'rounded px-2' }}
                        onClick={zoom.toggleActualSize}
                    >
                        1:1
                    </Button>
                </div>
            </div>
        </Portal>
    )
}

/* MARK: Minimap */
type MinimapProps = {
    offset: Offset
    scaled: Size
    source: string
    viewport: Size
    onMove: (offset: Offset) => void
}

/* 長邊 96，短邊隨原圖比例縮短 */
const minimapLongSide = 96

function Minimap(props: MinimapProps) {
    const box = () => {
        const ratio = props.scaled.width / props.scaled.height

        return {
            height: ratio >= 1 ? minimapLongSide / ratio : minimapLongSide,
            width: ratio >= 1 ? minimapLongSide : minimapLongSide * ratio,
        }
    }

    const moveTo = (event: PointerEvent) => {
        if (!(event.currentTarget instanceof HTMLElement)) {
            return
        }

        const rect = event.currentTarget.getBoundingClientRect()
        const ratioX = (event.clientX - rect.left) / rect.width
        const ratioY = (event.clientY - rect.top) / rect.height

        props.onMove({
            x: -(ratioX - 0.5) * props.scaled.width,
            y: -(ratioY - 0.5) * props.scaled.height,
        })
    }

    const frame = () => {
        const size = box()
        const visibleWidth = Math.min(1, props.viewport.width / props.scaled.width)
        const visibleHeight = Math.min(1, props.viewport.height / props.scaled.height)
        const centerX = 0.5 - props.offset.x / props.scaled.width
        const centerY = 0.5 - props.offset.y / props.scaled.height

        return {
            height: size.height * visibleHeight,
            left: size.width * (centerX - visibleWidth / 2),
            top: size.height * (centerY - visibleHeight / 2),
            width: size.width * visibleWidth,
        }
    }

    return (
        <div
            class='absolute bottom-4 right-4 overflow-hidden rounded-md border border-white/[0.09] bg-black/40 backdrop-blur-[8px]'
            style={{ height: `${box().height}px`, width: `${box().width}px` }}
            aria-hidden='true'
        >
            <div
                class='relative h-full w-full cursor-crosshair select-none touch-none'
                onDblClick={event => event.preventDefault()}
                onPointerDown={event => {
                    event.preventDefault()
                    event.stopPropagation()
                    event.currentTarget.setPointerCapture(event.pointerId)
                    moveTo(event)
                }}
                onPointerMove={event => {
                    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
                        moveTo(event)
                    }
                }}
            >
                <img
                    class='pointer-events-none h-full w-full object-fill opacity-70'
                    src={props.source}
                    alt=''
                    draggable={false}
                />
                <div
                    class='pointer-events-none absolute border border-white/80 bg-white/10'
                    style={{
                        height: `${frame().height}px`,
                        left: `${frame().left}px`,
                        top: `${frame().top}px`,
                        width: `${frame().width}px`,
                    }}
                />
            </div>
        </div>
    )
}
