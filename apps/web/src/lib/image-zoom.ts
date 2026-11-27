import { createEffect, createSignal, onCleanup } from 'solid-js'

import { createPinch } from '#/lib/interaction'

export type Offset = {
    x: number
    y: number
}

export type Size = {
    height: number
    width: number
}

/* Fit 之後的級距，到端點時 −/+ 會 disabled */
export const zoomSteps = [100, 150, 200, 300, 400, 600, 800]

export const maxPercent = zoomSteps[zoomSteps.length - 1]!

const sameSize = (left: Size, right: Size) => (
    left.height === right.height && left.width === right.width
)

/* deltaY 的單位隨裝置而異，先換算成像素再決定這一格要縮放多少 */
const deltaModeScale: Record<number, number> = {
    0: 1,
    1: 16,
    2: 400,
}

/*
 * 倍率以螢幕實體像素計：100% 是一個圖片像素對一個實體像素，換成 CSS 尺寸要除以顯示縮放。
 * shortcut: 只在計算時讀 devicePixelRatio，視窗拖到不同縮放的螢幕時要等下一次縮放才會更新
 */
const pixelRatio = () => window.devicePixelRatio || 1

function zoomFactor(event: WheelEvent): number {
    const pixels = event.deltaY * (deltaModeScale[event.deltaMode] ?? 1)

    // 夾住單一事件的幅度，避免一格就從 Fit 衝到上限
    return Math.min(1.5, Math.max(1 / 1.5, Math.exp(-pixels / 300)))
}

/*
 * 圖片檢視的縮放與平移。呼叫端只要把 setViewportRef 接到容器、把 pointer/wheel
 * 事件轉進來，並在圖片載入後回報 setNatural，其餘的量測與計算都在這裡。
 */
export function createImageZoom() {
    // undefined 代表 Fit；上限夾在 setter 裡，任何寫入路徑都繞不過
    const [zoomPercent, setZoomPercent] = createSignal<number>()
    const setZoom = (value: number | undefined) => setZoomPercent(
        value === undefined ? undefined : Math.min(maxPercent, value),
    )

    const [offset, setOffset] = createSignal<Offset>({ x: 0, y: 0 })
    // 每次量測都是新物件，沒有比較器會讓依賴它的 effect 無限自我觸發
    const [natural, setNatural] = createSignal<Size>({ height: 0, width: 0 }, { equals: sameSize })
    const [viewport, setViewport] = createSignal<Size>({ height: 0, width: 0 }, { equals: sameSize })
    const [dragging, setDragging] = createSignal(false)
    const [viewportRef, setViewportRef] = createSignal<HTMLElement>()

    let dragOrigin: { offset: Offset, x: number, y: number } | undefined
    let pointerMoved = false

    const fitPercent = () => {
        const { height, width } = natural()
        const box = viewport()
        if (!height || !width || !box.height || !box.width) {
            return 100
        }

        return Math.min(box.width / width, box.height / height) * 100 * pixelRatio()
    }

    const percent = () => zoomPercent() ?? fitPercent()
    const scale = () => percent() / 100 / pixelRatio()

    const isFit = () => zoomPercent() === undefined

    const scaled = (): Size => ({
        height: natural().height * scale(),
        width: natural().width * scale(),
    })

    const overflows = () => {
        const box = viewport()
        const size = scaled()

        return size.width > box.width + 1 || size.height > box.height + 1
    }

    const clamp = (value: Offset): Offset => {
        const box = viewport()
        const size = scaled()
        const limitX = Math.max(0, (size.width - box.width) / 2)
        const limitY = Math.max(0, (size.height - box.height) / 2)

        return {
            x: Math.min(limitX, Math.max(-limitX, value.x)),
            y: Math.min(limitY, Math.max(-limitY, value.y)),
        }
    }

    const applyZoom = (target: number | undefined, anchor?: Offset) => {
        const next = target === undefined
            ? undefined
            : Math.min(maxPercent, target)

        if (next === zoomPercent()) {
            return
        }

        const previousScale = scale()
        setZoom(next)

        if (next === undefined) {
            setOffset({ x: 0, y: 0 })
            return
        }

        if (!anchor) {
            setOffset(current => clamp(current))
            return
        }

        // 讓游標下的那一點在縮放後留在原位
        const nextScale = next / 100 / pixelRatio()
        const current = offset()
        const pointX = (anchor.x - current.x) / previousScale
        const pointY = (anchor.y - current.y) / previousScale

        setOffset(clamp({
            x: anchor.x - pointX * nextScale,
            y: anchor.y - pointY * nextScale,
        }))
    }

    /* 低於 Fit 就回到 Fit 模式，而不是留一個比 Fit 還小的百分比 */
    const requestPercent = (value: number) => {
        applyZoom(value <= fitPercent() ? undefined : value)
    }

    const measure = () => {
        const element = viewportRef()
        if (!element) return

        const rect = element.getBoundingClientRect()
        setViewport({ height: rect.height, width: rect.width })
    }

    createEffect(() => {
        const element = viewportRef()
        if (!element) return

        // 周邊元素出現/消失、視窗縮放都會改變可用空間，交給 observer 而不是追蹤 signal
        const observer = new ResizeObserver(measure)
        observer.observe(element)
        measure()

        onCleanup(() => observer.disconnect())
    })

    const pinch = createPinch({
        onStart: () => {
            dragOrigin = undefined
            setDragging(false)
        },
        onPinch: (scale, center) => {
            const element = viewportRef()
            if (!element) return

            const rect = element.getBoundingClientRect()
            const next = percent() * scale
            pointerMoved = true
            applyZoom(next <= fitPercent() ? undefined : next, {
                x: center.x - rect.left - rect.width / 2,
                y: center.y - rect.top - rect.height / 2,
            })
        },
    })

    return {
        canZoomIn: () => percent() < maxPercent,
        canZoomOut: () => zoomPercent() !== undefined,
        dragging,
        isFit,
        offset,
        overflows,
        percent,
        scaled,
        viewport,

        /* 剛結束一次拖曳就回報 true 並清除，讓呼叫端跳過那一次 click */
        consumeDrag: () => {
            if (!pointerMoved) {
                return false
            }

            pointerMoved = false
            return true
        },

        endDrag: () => {
            dragOrigin = undefined
            setDragging(false)
        },

        /* 圖片尺寸切換時保留 zoom，但把舊圖片的超界平移收回新邊界 */
        clampOffset: () => setOffset(current => clamp(current)),

        moveTo: (value: Offset) => setOffset(clamp(value)),

        onPointerDown: (event: PointerEvent) => {
            pointerMoved = false
            if (!overflows()) return

            event.preventDefault()
            dragOrigin = { offset: offset(), x: event.clientX, y: event.clientY }
            setDragging(true)

            if (event.currentTarget instanceof HTMLElement) {
                event.currentTarget.setPointerCapture(event.pointerId)
            }
        },

        onPointerMove: (event: PointerEvent) => {
            if (!dragOrigin || pinch.active()) return

            const shiftX = event.clientX - dragOrigin.x
            const shiftY = event.clientY - dragOrigin.y

            if (Math.abs(shiftX) > 3 || Math.abs(shiftY) > 3) {
                pointerMoved = true
            }

            setOffset(clamp({
                x: dragOrigin.offset.x + shiftX,
                y: dragOrigin.offset.y + shiftY,
            }))
        },

        /* 捏合縮放：接在容器上，兩指落在圖片外也算 */
        onPinchDown: (event: PointerEvent) => {
            if (event.pointerType === 'touch' && event.isPrimary) pointerMoved = false
            pinch.onPointerDown(event)
        },
        onPinchMove: pinch.onPointerMove,
        onPinchUp: pinch.onPointerUp,

        onWheel: (event: WheelEvent) => {
            event.preventDefault()

            if (event.deltaY === 0) {
                return
            }

            const element = viewportRef()
            if (!element) return

            const rect = element.getBoundingClientRect()
            // 錨點以容器中心為原點，因為圖片是置中後再用 translate 位移
            const anchor = {
                x: event.clientX - rect.left - rect.width / 2,
                y: event.clientY - rect.top - rect.height / 2,
            }
            const next = percent() * zoomFactor(event)

            applyZoom(next <= fitPercent() ? undefined : next, anchor)
        },

        requestPercent,
        reset: () => applyZoom(undefined),
        setNatural,
        setViewportRef,

        toggleActualSize: () => applyZoom(isFit() ? 100 : undefined),

        zoomIn: () => {
            const index = zoomSteps.findIndex(step => step > percent() + 0.5)
            applyZoom(index < 0 ? maxPercent : zoomSteps[index])
        },

        zoomOut: () => {
            const next = [...zoomSteps].reverse().find(step => step < percent() - 0.5)
            applyZoom(next !== undefined && next > fitPercent() ? next : undefined)
        },
    }
}
