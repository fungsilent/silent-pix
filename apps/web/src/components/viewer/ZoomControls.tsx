import { Minus, Plus } from 'lucide-solid'
import { createSignal, Show } from 'solid-js'

import { Button } from '#/components/base/Button'

import type { createImageZoom } from '#/lib/imageZoom'

type Zoom = ReturnType<typeof createImageZoom>

type ZoomControlsProps = {
    zoom: Zoom
}

export function ZoomControls(props: ZoomControlsProps) {
    const [editingZoom, setEditingZoom] = createSignal(false)

    return (
        <div class='absolute bottom-6 left-6 z-10 flex h-9 items-center gap-1 rounded-md border border-stage-line bg-stage-control px-1 text-on-stage backdrop-blur-[8px]'>
            <Button
                variant='ghost'
                disabled={!props.zoom.canZoomOut()}
                classes={{ root: 'size-7 rounded p-0 text-on-stage hover:bg-stage-control-hover disabled:opacity-30' }}
                onClick={props.zoom.zoomOut}
            >
                <Minus
                    size={15}
                    strokeWidth={1.8}
                />
            </Button>

            <Show
                when={editingZoom()}
                fallback={(
                    <Button
                        variant='ghost'
                        classes={{
                            root: 'w-[54px] rounded p-0 text-on-stage tabular-nums hover:bg-stage-control-hover',
                        }}
                        onClick={() => setEditingZoom(true)}
                    >
                        {props.zoom.isFit() ? 'Fit' : `${Math.round(props.zoom.percent())}%`}
                    </Button>
                )}
            >
                <input
                    class='h-7 w-[54px] rounded bg-stage-control-hover text-center text-xs tabular-nums text-on-stage outline-none'
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
                disabled={!props.zoom.canZoomIn()}
                classes={{ root: 'size-7 rounded p-0 text-on-stage hover:bg-stage-control-hover disabled:opacity-30' }}
                onClick={props.zoom.zoomIn}
            >
                <Plus
                    size={15}
                    strokeWidth={1.8}
                />
            </Button>

            <span
                class='mx-1 h-[18px] w-px bg-stage-ring'
            />

            <Button
                variant='ghost'
                classes={{ root: 'rounded px-2 text-on-stage hover:bg-stage-control-hover' }}
                onClick={props.zoom.toggleActualSize}
            >
                1:1
            </Button>
        </div>
    )
}
