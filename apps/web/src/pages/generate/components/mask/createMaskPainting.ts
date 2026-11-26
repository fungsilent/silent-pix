import { createSignal, onCleanup } from 'solid-js'

import type { createImageZoom, Offset } from '#/lib/image-zoom'
import type { createMaskCanvas } from '#/pages/generate/components/mask/mask.canvas'
import type { Accessor, JSX } from 'solid-js'

export type MaskHistory = { canUndo: boolean, canRedo: boolean, hasMask: boolean }
export type MaskHistoryAction = 'undo' | 'redo' | 'clear'
export type MaskTool = 'brush' | 'eraser' | 'hand'
type MaskCanvas = Awaited<ReturnType<typeof createMaskCanvas>>

type MaskPaintingOptions = {
    width: number
    height: number
    zoom: ReturnType<typeof createImageZoom>
    tool: Accessor<MaskTool>
    size: Accessor<number>
    panning: Accessor<boolean>
    exporting: Accessor<boolean>
}

/* 筆刷／橡皮擦的 pointer 狀態、繪製、undo／redo history 與 rAF 重繪 */
export function createMaskPainting(options: MaskPaintingOptions) {
    const { width, height, zoom } = options
    const [cursor, setCursor] = createSignal<Offset>()
    const [history, setHistory] = createSignal<MaskHistory>()
    const [activePointer, setActivePointer] = createSignal<{ id: number, lastPoint: Offset | null }>()
    const ready = () => history() !== undefined
    const canEdit = () => ready() && !options.exporting() && !activePointer()

    let surface: HTMLDivElement | undefined
    let preview: CanvasRenderingContext2D | null = null
    let mask: MaskCanvas | undefined
    let frame: number | undefined

    const redraw = () => {
        if (frame !== undefined) return

        frame = requestAnimationFrame(() => {
            frame = undefined
            if (mask && preview) mask.drawPreview(preview, getComputedStyle(preview.canvas).color)
        })
    }

    /* 圖與遮罩載入完成後交給繪製 */
    const attach = (context: CanvasRenderingContext2D, canvas: MaskCanvas) => {
        preview = context
        mask = canvas
        setHistory(canvas.state())
        redraw()
    }

    const runHistory = (action: MaskHistoryAction) => {
        if (!mask || !canEdit()) return

        mask[action]()
        setHistory(mask.state())
        redraw()
    }

    const imagePoint = (event: PointerEvent, rect: DOMRect): Offset => ({
        x: (event.clientX - rect.left) * width / rect.width,
        y: (event.clientY - rect.top) * height / rect.height,
    })

    const onPointerDown: JSX.EventHandler<HTMLDivElement, PointerEvent> = event => {
        if (event.button !== 0 || !surface || !canEdit()) return

        if (options.panning()) {
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
        mask.paint(point, point, options.size(), options.tool() === 'eraser')
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
            mask.paint(pointer.lastPoint, point, options.size(), options.tool() === 'eraser')
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

    onCleanup(() => {
        if (frame !== undefined) cancelAnimationFrame(frame)
    })

    return {
        cursor,
        clearCursor: () => setCursor(undefined),
        history,
        ready,
        canEdit,
        mask: () => mask,
        attach,
        runHistory,
        setSurface: (element: HTMLDivElement) => { surface = element },
        onPointerDown,
        onPointerMove,
        endPointer,
    }
}
