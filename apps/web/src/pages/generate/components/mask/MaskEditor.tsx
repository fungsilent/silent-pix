import { Brush, Check, Eraser, Hand, LoaderCircle, Redo2, Trash2, TriangleAlert, Undo2, X } from 'lucide-solid'
import { createSignal, onCleanup, onMount, Show } from 'solid-js'
import { Portal } from 'solid-js/web'

import { resolveImageUrl } from '#/api/image'
import { Button } from '#/components/base/Button'
import { Slider } from '#/components/field'
import { ZoomControls } from '#/components/viewer/ZoomControls'
import { cn } from '#/lib/cn'
import { useHotkeys } from '#/lib/hotkey'
import { t } from '#/lib/i18n'
import { createImageZoom } from '#/lib/imageZoom'
import { overlayRoot } from '#/lib/overlayRoot'
import { createMaskCanvas } from '#/pages/generate/components/mask/mask.canvas'
import { overlayStore } from '#/store/overlay'

import type { ViewerImage } from '#/components/viewer/ZoomStage'
import type { Offset } from '#/lib/imageZoom'
import type { OverlayId } from '#/store/overlay'
import type { JSX } from 'solid-js'

type MaskEditorProps = {
    reference: ViewerImage & { maskUrl: string | null }
    onClose: () => void
    onDone: (file: File | null) => void
}

type History = { canUndo: boolean, canRedo: boolean, hasMask: boolean }
type HistoryAction = 'undo' | 'redo' | 'clear'
type MaskTool = 'brush' | 'eraser' | 'hand'

const glass = 'border-stage-line bg-stage-control text-on-stage backdrop-blur-[8px]'
const iconButton = 'size-7 rounded p-0 text-on-stage hover:bg-stage-control-hover disabled:opacity-30'
const separator = 'mx-1 h-[18px] w-px shrink-0 bg-stage-ring'
const minBrushSize = 4
const maxBrushSize = 256

export function MaskEditor(props: MaskEditorProps) {
    const { url, maskUrl, width, height } = props.reference
    const zoom = createImageZoom()
    zoom.setNatural({ width, height })

    const [tool, setTool] = createSignal<MaskTool>('brush')
    const [size, setSize] = createSignal(96)
    const [spaceHeld, setSpaceHeld] = createSignal(false)
    const [cursor, setCursor] = createSignal<Offset>()
    const [history, setHistory] = createSignal<History>()
    const [loadError, setLoadError] = createSignal<'reference' | 'mask' | 'canvas'>()
    const [exporting, setExporting] = createSignal(false)
    const [exportFailed, setExportFailed] = createSignal(false)
    const [activePointer, setActivePointer] = createSignal<{ id: number, lastPoint: Offset | null }>()
    const ready = () => history() !== undefined
    const canEdit = () => ready() && !exporting() && !activePointer()
    const panning = () => tool() === 'hand' || spaceHeld()
    const brushDiameter = () => size() * zoom.scaled().width / width

    let surface: HTMLDivElement | undefined
    let referenceImage: HTMLImageElement | undefined
    let previewCanvas: HTMLCanvasElement | undefined
    let preview: CanvasRenderingContext2D | null = null
    let mask: Awaited<ReturnType<typeof createMaskCanvas>> | undefined
    let frame: number | undefined
    let overlayId: OverlayId | undefined
    let disposed = false

    const redraw = () => {
        if (frame !== undefined) return

        frame = requestAnimationFrame(() => {
            frame = undefined
            if (mask && preview) mask.drawPreview(preview, getComputedStyle(preview.canvas).color)
        })
    }

    const loadImages = async () => {
        if (disposed || !referenceImage || !previewCanvas) return

        setLoadError(undefined)
        referenceImage.src = resolveImageUrl(url)
        try {
            await referenceImage.decode()
        }
        catch {
            if (!disposed) setLoadError('reference')
            return
        }
        if (disposed) return

        preview = previewCanvas.getContext('2d')
        if (!preview) {
            setLoadError('canvas')
            return
        }

        try {
            const result = await createMaskCanvas(width, height, maskUrl ? resolveImageUrl(maskUrl) : null)
            if (disposed) return

            mask = result
            setHistory(result.state())
            redraw()
        }
        catch {
            if (!disposed) setLoadError(maskUrl ? 'mask' : 'canvas')
        }
    }

    const runHistory = (action: HistoryAction) => {
        if (!mask || !canEdit()) return

        mask[action]()
        setHistory(mask.state())
        redraw()
    }

    const finish = async () => {
        if (!mask || !canEdit()) return

        if (!mask.hasChanges()) {
            props.onClose()
            return
        }

        setExporting(true)
        setExportFailed(false)
        try {
            const file = await mask.exportPng()
            if (!disposed) props.onDone(file)
        }
        catch {
            if (!disposed) setExportFailed(true)
        }
        finally {
            if (!disposed) setExporting(false)
        }
    }

    const imagePoint = (event: PointerEvent, rect: DOMRect): Offset => ({
        x: (event.clientX - rect.left) * width / rect.width,
        y: (event.clientY - rect.top) * height / rect.height,
    })

    const onPointerDown: JSX.EventHandler<HTMLDivElement, PointerEvent> = event => {
        if (event.button !== 0 || !surface || !canEdit()) return

        if (panning()) {
            if (!zoom.overflows()) return

            setActivePointer({ id: event.pointerId, lastPoint: null })
            setCursor(undefined)
            zoom.onPointerDown(event)
            return
        }

        if (!mask || event.target !== surface) return

        const point = imagePoint(event, surface.getBoundingClientRect())
        setActivePointer({ id: event.pointerId, lastPoint: point })
        event.currentTarget.setPointerCapture(event.pointerId)
        event.preventDefault()
        mask.paint(point, point, size(), tool() === 'eraser')
        redraw()
    }

    const onPointerMove: JSX.EventHandler<HTMLDivElement, PointerEvent> = event => {
        const pointer = activePointer()
        if (!surface || (pointer && pointer.id !== event.pointerId)) return

        if (pointer?.lastPoint === null) {
            zoom.onPointerMove(event)
            return
        }

        const rect = surface.getBoundingClientRect()
        const point = imagePoint(event, rect)
        if (point.x >= 0 && point.x <= width && point.y >= 0 && point.y <= height) {
            const stage = event.currentTarget.getBoundingClientRect()
            setCursor({ x: event.clientX - stage.left, y: event.clientY - stage.top })
        }
        else {
            setCursor(undefined)
        }

        if (mask && pointer) {
            mask.paint(pointer.lastPoint, point, size(), tool() === 'eraser')
            pointer.lastPoint = point
            redraw()
        }
    }

    const endPointer = (event: PointerEvent) => {
        const pointer = activePointer()
        if (!pointer || pointer.id !== event.pointerId) return

        if (pointer.lastPoint && mask) {
            mask.commit()
            setHistory(mask.state())
        }
        zoom.endDrag()
        setActivePointer(undefined)
        if (event.pointerType !== 'mouse') setCursor(undefined)
    }

    const resizeBrush = (delta: number) => {
        setSize(current => Math.min(maxBrushSize, Math.max(minBrushSize, current + delta)))
    }
    const canResizeBrush = () => canEdit() && !panning()

    onMount(() => {
        overlayId = overlayStore.open()
    })
    useHotkeys([
        { key: 'Escape', modifiers: 'any', allowInEditable: true, preventDefault: true, onPress: () => props.onClose() },
        { key: 'b', when: canEdit, onPress: () => setTool('brush') },
        { key: 'e', when: canEdit, onPress: () => setTool('eraser') },
        { key: 'h', when: canEdit, onPress: () => setTool('hand') },
        { key: '[', when: canResizeBrush, onPress: () => resizeBrush(-8) },
        { key: ']', when: canResizeBrush, onPress: () => resizeBrush(8) },
        { key: 'z', modifiers: 'mod', shift: false, when: canEdit, preventDefault: true, onPress: () => runHistory('undo') },
        { key: 'z', modifiers: 'mod', shift: true, when: canEdit, preventDefault: true, onPress: () => runHistory('redo') },
        {
            code: 'Space',
            when: canEdit,
            preventDefault: true,
            onPress: () => setSpaceHeld(true),
            onRelease: () => setSpaceHeld(false),
        },
    ], () => overlayId !== undefined && overlayStore.isTop(overlayId))

    onCleanup(() => {
        disposed = true
        if (frame !== undefined) cancelAnimationFrame(frame)
        if (overlayId) overlayStore.close(overlayId)
    })

    return (
        <Portal mount={overlayRoot()}>
            <div class='backdrop pointer-events-auto absolute inset-0 z-50 select-none bg-backdrop backdrop-blur-[6px]'>
                <div
                    ref={zoom.setViewportRef}
                    class='absolute inset-0 flex touch-none items-center justify-center overflow-hidden'
                    classList={{ 'cursor-grab': ready() && panning() && !zoom.dragging(), 'cursor-grabbing': zoom.dragging() }}
                    onPointerDown={onPointerDown}
                    onPointerMove={onPointerMove}
                    onPointerUp={endPointer}
                    onPointerCancel={endPointer}
                    onLostPointerCapture={endPointer}
                    onPointerLeave={() => setCursor(undefined)}
                    onWheel={event => {
                        if (ready()) zoom.onWheel(event)
                    }}
                >
                    <div
                        ref={element => { surface = element }}
                        class='absolute'
                        classList={{ invisible: !ready(), 'cursor-none': ready() && !panning() && !zoom.dragging() }}
                        style={{
                            width: `${zoom.scaled().width}px`,
                            height: `${zoom.scaled().height}px`,
                            translate: `${zoom.offset().x}px ${zoom.offset().y}px`,
                        }}
                    >
                        <img
                            ref={element => { referenceImage = element }}
                            class='pointer-events-none absolute inset-0 size-full'
                            alt={t('fields.referenceImage')}
                            draggable={false}
                        />
                        <canvas
                            ref={element => {
                                previewCanvas = element
                                // Decode after the portal has attached the image to the document.
                                queueMicrotask(() => void loadImages())
                            }}
                            class='pointer-events-none absolute inset-0 size-full text-accent opacity-50'
                            width={width}
                            height={height}
                        />
                    </div>
                    <Show when={ready() && !panning() && !zoom.dragging() && cursor()}>
                        {point => (
                            <div
                                class='pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-on-stage shadow-[0_0_0_1px_rgb(0_0_0/0.5)]'
                                classList={{ 'border-dashed': tool() === 'eraser' }}
                                style={{
                                    width: `${brushDiameter()}px`,
                                    height: `${brushDiameter()}px`,
                                    left: `${point().x}px`,
                                    top: `${point().y}px`,
                                }}
                            />
                        )}
                    </Show>
                    <Show when={!ready()}>
                        <Show
                            when={loadError()}
                            fallback={(
                                <LoaderCircle
                                    class='animate-spin text-stage-overlay-text'
                                    size={20}
                                    strokeWidth={1.8}
                                />
                            )}
                        >
                            {cause => (
                                <div class='flex flex-col items-center gap-3 px-4 text-stage-overlay-text'>
                                    <p class='m-0 flex items-center gap-1.5 text-xs'>
                                        <TriangleAlert
                                            class='shrink-0 text-stage-danger'
                                            size={16}
                                            strokeWidth={1.8}
                                        />
                                        {t(`image.mask.${cause()}LoadFailed`)}
                                    </p>
                                    <Button
                                        variant='ghost'
                                        classes={{ root: cn('h-7 py-0 hover:bg-stage-control-hover', glass) }}
                                        onClick={() => void loadImages()}
                                    >
                                        {t('common.retry')}
                                    </Button>
                                </div>
                            )}
                        </Show>
                    </Show>
                </div>

                <Show when={history()}>
                    {state => (
                        <MaskToolbar
                            tool={tool()}
                            size={size()}
                            history={state()}
                            disabled={!canEdit()}
                            onToolChange={setTool}
                            onSizeChange={setSize}
                            onHistory={runHistory}
                        />
                    )}
                </Show>

                <div class='absolute right-6 top-6 z-10 flex items-center gap-2'>
                    <Button
                        tone='accent'
                        variant='solid'
                        disabled={!canEdit()}
                        classes={{ root: 'h-8 gap-1.5 py-0 font-medium disabled:bg-on-stage/10 disabled:text-on-stage/45 disabled:opacity-100' }}
                        onClick={() => void finish()}
                    >
                        <Check size={16} />
                        {t('image.mask.done')}
                    </Button>
                    <Button
                        variant='ghost'
                        title={t('common.close')}
                        classes={{ root: cn('size-8 rounded-md p-0 hover:bg-stage-control-hover', glass) }}
                        onClick={props.onClose}
                    >
                        <X size={16} />
                    </Button>
                </div>
                <Show when={exportFailed()}>
                    <span class='absolute bottom-6 left-1/2 z-10 -translate-x-1/2 rounded-md bg-stage-control px-3 py-2 text-xs text-on-stage'>
                        {t('image.mask.exportFailed')}
                    </span>
                </Show>
                <Show when={ready()}><ZoomControls zoom={zoom} /></Show>
            </div>
        </Portal>
    )
}

type MaskToolbarProps = {
    tool: MaskTool
    size: number
    history: History
    disabled: boolean
    onToolChange: (tool: MaskTool) => void
    onSizeChange: (size: number) => void
    onHistory: (action: HistoryAction) => void
}

function MaskToolbar(props: MaskToolbarProps) {
    const toolClass = (tool: MaskTool) => cn(
        'size-7 shrink-0 rounded p-0',
        props.tool === tool
            ? 'bg-on-stage/20 text-on-stage hover:bg-on-stage/20'
            : 'text-on-stage/75 hover:bg-on-stage/10 hover:text-on-stage',
    )
    const sizeDisabled = () => props.tool === 'hand' || props.disabled

    return (
        <div class={cn('absolute left-6 top-16 z-10 flex h-9 items-center gap-1 rounded-md border px-1 min-[620px]:top-6', glass)}>
            <Button
                variant='ghost'
                disabled={props.disabled}
                title={`${t('image.mask.brush')} (B)`}
                classes={{ root: toolClass('brush') }}
                onClick={() => props.onToolChange('brush')}
            >
                <Brush size={15} />
            </Button>
            <Button
                variant='ghost'
                disabled={props.disabled}
                title={`${t('image.mask.eraser')} (E)`}
                classes={{ root: toolClass('eraser') }}
                onClick={() => props.onToolChange('eraser')}
            >
                <Eraser size={15} />
            </Button>
            <Button
                variant='ghost'
                disabled={props.disabled}
                title={`${t('image.mask.hand')} (H)`}
                classes={{ root: toolClass('hand') }}
                onClick={() => props.onToolChange('hand')}
            >
                <Hand size={15} />
            </Button>
            <span class={separator} />
            <span class={cn('pl-1 text-xs', sizeDisabled() ? 'text-on-stage/40' : 'text-on-stage/70')}>{t('image.mask.size')}</span>
            <Slider
                label={t('image.mask.size')}
                disabled={sizeDisabled()}
                min={minBrushSize}
                max={maxBrushSize}
                step={1}
                value={props.size}
                classes={{
                    root: 'w-16 data-[disabled]:opacity-40 min-[620px]:w-28',
                    control: 'px-1',
                    track: 'h-1.5 bg-stage-ring',
                    range: 'bg-on-stage',
                    thumb: 'size-3.5 bg-on-stage',
                }}
                onChange={props.onSizeChange}
            />
            <span class={cn('w-8 text-right text-xs tabular-nums', sizeDisabled() ? 'text-on-stage/40' : 'text-on-stage')}>{props.size}</span>
            <span class={separator} />
            <Button
                variant='ghost'
                disabled={props.disabled || !props.history.canUndo}
                title={t('image.mask.undo')}
                classes={{ root: iconButton }}
                onClick={() => props.onHistory('undo')}
            >
                <Undo2 size={15} />
            </Button>
            <Button
                variant='ghost'
                disabled={props.disabled || !props.history.canRedo}
                title={t('image.mask.redo')}
                classes={{ root: iconButton }}
                onClick={() => props.onHistory('redo')}
            >
                <Redo2 size={15} />
            </Button>
            <Button
                variant='ghost'
                disabled={props.disabled || !props.history.hasMask}
                title={t('image.mask.clear')}
                classes={{ root: iconButton }}
                onClick={() => props.onHistory('clear')}
            >
                <Trash2 size={15} />
            </Button>
        </div>
    )
}
