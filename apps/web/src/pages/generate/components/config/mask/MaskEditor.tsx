import { Brush, Check, Eraser, Hand, LoaderCircle, Redo2, Trash2, TriangleAlert, Undo2, X } from 'lucide-solid'
import { createSignal, onCleanup, onMount, Show } from 'solid-js'
import { Portal } from 'solid-js/web'

import { Button } from '#/components/base/Button'
import { Slider } from '#/components/field'
import { ZoomControls } from '#/components/viewer/ZoomControls'
import { resolveImageUrl } from '#/data/image/image.api'
import { t } from '#/lib/i18n'
import { createImageZoom } from '#/lib/image-zoom'
import { createHotkeys } from '#/lib/keyboard'
import { overlayRoot } from '#/lib/overlay-root'
import { createMaskPainting } from '#/pages/generate/components/config/mask/createMaskPainting'
import { createMaskCanvas } from '#/pages/generate/components/config/mask/mask.canvas'
import { overlayStore } from '#/store/overlay'
import { mergeClasses } from '#/utils/style'

import type { ViewerImage } from '#/components/viewer/ZoomStage'
import type { MaskHistory, MaskHistoryAction, MaskTool } from '#/pages/generate/components/config/mask/createMaskPainting'
import type { OverlayId } from '#/store/overlay'

type MaskEditorProps = {
    reference: ViewerImage & { maskUrl: string | null }
    onClose: () => void
    onDone: (file: File | null) => void
}

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
    const [loadError, setLoadError] = createSignal<'reference' | 'mask' | 'canvas'>()
    const [exporting, setExporting] = createSignal(false)
    const [exportFailed, setExportFailed] = createSignal(false)
    const panning = () => tool() === 'hand' || spaceHeld()
    const painting = createMaskPainting({ width, height, zoom, tool, size, panning, exporting })
    const { cursor, history, ready, canEdit, runHistory } = painting
    const brushDiameter = () => size() * zoom.scaled().width / width

    let referenceImage: HTMLImageElement | undefined
    let previewCanvas: HTMLCanvasElement | undefined
    let overlayId: OverlayId | undefined
    let disposed = false

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

        const preview = previewCanvas.getContext('2d')
        if (!preview) {
            setLoadError('canvas')
            return
        }

        try {
            const result = await createMaskCanvas(width, height, maskUrl ? resolveImageUrl(maskUrl) : null)
            if (disposed) return

            painting.attach(preview, result)
        }
        catch {
            if (!disposed) setLoadError(maskUrl ? 'mask' : 'canvas')
        }
    }

    const finish = async () => {
        const mask = painting.mask()
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

    const resizeBrush = (delta: number) => {
        setSize(current => Math.min(maxBrushSize, Math.max(minBrushSize, current + delta)))
    }
    const canResizeBrush = () => canEdit() && !panning()

    onMount(() => {
        overlayId = overlayStore.open()
    })
    createHotkeys([
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
        if (overlayId) overlayStore.close(overlayId)
    })

    return (
        <Portal mount={overlayRoot()}>
            <div class='backdrop pointer-events-auto absolute inset-0 z-50 select-none bg-backdrop backdrop-blur-[6px]'>
                <div
                    ref={zoom.setViewportRef}
                    class='absolute inset-0 flex touch-none items-center justify-center overflow-hidden'
                    classList={{ 'cursor-grab': ready() && panning() && !zoom.dragging(), 'cursor-grabbing': zoom.dragging() }}
                    onPointerDown={painting.onPointerDown}
                    onPointerMove={painting.onPointerMove}
                    onPointerUp={painting.endPointer}
                    onPointerCancel={painting.endPointer}
                    onLostPointerCapture={painting.endPointer}
                    onPointerLeave={painting.clearCursor}
                    onWheel={event => {
                        if (ready()) zoom.onWheel(event)
                    }}
                >
                    <div
                        ref={painting.setSurface}
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
                                        classes={{ root: mergeClasses('h-7 py-0 hover:bg-stage-control-hover', glass) }}
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
                        classes={{ root: mergeClasses('size-8 rounded-md p-0 hover:bg-stage-control-hover', glass) }}
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
    history: MaskHistory
    disabled: boolean
    onToolChange: (tool: MaskTool) => void
    onSizeChange: (size: number) => void
    onHistory: (action: MaskHistoryAction) => void
}

function MaskToolbar(props: MaskToolbarProps) {
    const toolClass = (tool: MaskTool) => mergeClasses(
        'size-7 shrink-0 rounded p-0',
        props.tool === tool
            ? 'bg-on-stage/20 text-on-stage hover:bg-on-stage/20'
            : 'text-on-stage/75 hover:bg-on-stage/10 hover:text-on-stage',
    )
    const sizeDisabled = () => props.tool === 'hand' || props.disabled

    return (
        <div class={mergeClasses('absolute left-6 top-16 z-10 flex h-9 items-center gap-1 rounded-md border px-1 min-[620px]:top-6', glass)}>
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
            <span class={mergeClasses('pl-1 text-xs', sizeDisabled() ? 'text-on-stage/40' : 'text-on-stage/70')}>{t('image.mask.size')}</span>
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
            <span class={mergeClasses('w-8 text-right text-xs tabular-nums', sizeDisabled() ? 'text-on-stage/40' : 'text-on-stage')}>{props.size}</span>
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
