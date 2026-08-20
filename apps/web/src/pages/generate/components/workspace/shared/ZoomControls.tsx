import { Minus, Plus } from 'lucide-solid'
import { createSignal, Show } from 'solid-js'

import { Button } from '#/components/base/Button'
import { cn } from '#/lib/cn'

import type { createImageZoom } from '#/lib/imageZoom'

type Zoom = ReturnType<typeof createImageZoom>

type ZoomControlsProps = {
    zoom: Zoom
}

export function ZoomControls(props: ZoomControlsProps) {
    const [editingZoom, setEditingZoom] = createSignal(false)

    return (
        <div class='absolute bottom-6 left-6 z-10 flex h-9 items-center gap-1 rounded-md border border-white/[0.09] bg-surface/75 px-1 backdrop-blur-[8px]'>
            <Button
                variant='ghost'
                aria-label='Zoom out'
                disabled={!props.zoom.canZoomOut()}
                classes={{ root: 'size-7 rounded p-0 disabled:opacity-30' }}
                onClick={props.zoom.zoomOut}
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
                                !props.zoom.isFit() && 'text-fg',
                            ),
                        }}
                        onClick={() => setEditingZoom(true)}
                    >
                        {props.zoom.isFit() ? 'Fit' : `${Math.round(props.zoom.percent())}%`}
                    </Button>
                )}
            >
                <input
                    class='h-7 w-[54px] rounded bg-active text-center text-xs tabular-nums text-fg outline-none'
                    type='text'
                    autofocus
                    value={Math.round(props.zoom.percent())}
                    onBlur={() => setEditingZoom(false)}
                    onChange={event => {
                        const value = Number(event.currentTarget.value.replace('%', ''))
                        if (Number.isFinite(value) && value > 0) {
                            props.zoom.requestPercent(value)
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
                disabled={!props.zoom.canZoomIn()}
                classes={{ root: 'size-7 rounded p-0 disabled:opacity-30' }}
                onClick={props.zoom.zoomIn}
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
                onClick={props.zoom.toggleActualSize}
            >
                1:1
            </Button>
        </div>
    )
}
