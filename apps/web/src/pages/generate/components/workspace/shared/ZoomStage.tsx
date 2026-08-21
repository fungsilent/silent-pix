import { createEffect, For, Show } from 'solid-js'

import { cn } from '#/lib/cn'

import type { createImageZoom, Offset, Size } from '#/lib/imageZoom'
import type { ViewerImage } from '#/store/workspace'

type Zoom = ReturnType<typeof createImageZoom>

type ZoomStageProps = {
    images: ViewerImage[]
    selectedIndex: number
    zoom: Zoom
    onClick: (event: MouseEvent) => void
}

export function ZoomStage(props: ZoomStageProps) {
    const image = () => props.images[props.selectedIndex] ?? props.images[0]

    createEffect(() => {
        const selected = image()
        if (!selected) {
            return
        }

        props.zoom.setNatural({
            height: selected.height,
            width: selected.width,
        })
        props.zoom.clampOffset()
    })

    return (
        <div
            ref={props.zoom.setViewportRef}
            class='relative flex min-h-0 w-full flex-1 items-center justify-center overflow-hidden'
            onClick={props.onClick}
            onDblClick={event => {
                event.preventDefault()
                props.zoom.toggleActualSize()
            }}
            onWheel={props.zoom.onWheel}
        >
            <For each={props.images}>
                {(source, index) => (
                    <img
                        class={cn(
                            'absolute max-w-none select-none',
                            index() === props.selectedIndex
                                ? 'opacity-100'
                                : 'pointer-events-none opacity-0',
                            index() === props.selectedIndex && props.zoom.overflows()
                                ? (props.zoom.dragging() ? 'cursor-grabbing' : 'cursor-grab')
                                : 'cursor-default',
                        )}
                        style={{
                            height: props.zoom.scaled().height ? `${props.zoom.scaled().height}px` : 'auto',
                            translate: `${props.zoom.offset().x}px ${props.zoom.offset().y}px`,
                            width: props.zoom.scaled().width ? `${props.zoom.scaled().width}px` : 'auto',
                        }}
                        src={source.url}
                        alt={index() === props.selectedIndex ? 'Generated preview' : ''}
                        aria-hidden={index() === props.selectedIndex ? undefined : 'true'}
                        draggable={false}
                        onPointerCancel={props.zoom.endDrag}
                        onPointerDown={props.zoom.onPointerDown}
                        onPointerMove={props.zoom.onPointerMove}
                        onPointerUp={props.zoom.endDrag}
                    />
                )}
            </For>

            <Show when={props.zoom.overflows() && image()}>
                {source => (
                    <Minimap
                        offset={props.zoom.offset()}
                        scaled={props.zoom.scaled()}
                        source={source().url}
                        viewport={props.zoom.viewport()}
                        onMove={props.zoom.moveTo}
                    />
                )}
            </Show>
        </div>
    )
}

type MinimapProps = {
    offset: Offset
    scaled: Size
    source: string
    viewport: Size
    onMove: (offset: Offset) => void
}

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
