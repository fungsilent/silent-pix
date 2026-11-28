import { createEffect, createMemo, createSignal, on, onCleanup } from 'solid-js'

export type MobileFit = { covered: number, peek: number }

type MobileFitOptions = {
    fit: () => MobileFit | undefined
    aspect: () => number | undefined
    strip: () => boolean
}

const fitHeight = { min: 160, max: 360, empty: 240 }
const stripHeight = 80

/* 手機圖片卡：高度依圖片比例，被內容卡蓋住時圖片由 contain 放大到 cover */
export function createMobileFit(options: MobileFitOptions) {
    const [area, setArea] = createSignal<HTMLElement>()
    const [width, setWidth] = createSignal(0)

    createEffect(on(() => options.fit() !== undefined && area(), element => {
        if (!element) return

        const observer = new ResizeObserver(([entry]) => setWidth(entry?.contentRect.width ?? 0))
        observer.observe(element)
        onCleanup(() => observer.disconnect())
    }))

    const areaHeight = () => {
        const ratio = options.aspect()
        return ratio ? Math.min(fitHeight.max, Math.max(fitHeight.min, width() / ratio)) : fitHeight.empty
    }
    const stageHeight = () => areaHeight() + (options.strip() ? stripHeight : 0)
    const box = createMemo(() => {
        const fit = options.fit()
        const ratio = options.aspect()
        const areaWidth = width()
        if (!fit || !ratio || areaWidth === 0) return undefined

        const height = areaHeight()
        /* 縮圖列在下方，先被蓋住 */
        const visible = Math.min(height, Math.max(fit.peek, stageHeight() - fit.covered))
        const progress = (height - visible) / (height - fit.peek)
        const contain = Math.min(areaWidth, height * ratio)
        const cover = Math.max(areaWidth, fit.peek * ratio)
        const imageWidth = contain + (cover - contain) * progress
        const imageHeight = imageWidth / ratio

        return {
            left: `${(areaWidth - imageWidth) / 2}px`,
            top: `${visible / 2 - imageHeight / 2}px`,
            width: `${imageWidth}px`,
            height: `${imageHeight}px`,
        }
    })

    return { setArea, stageHeight, box }
}
