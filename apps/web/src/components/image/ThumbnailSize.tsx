import { Grid, Square } from 'lucide-solid'
import { createMemo, createSignal, onCleanup } from 'solid-js'
import { z } from 'zod'

import { Slider } from '#/components/field/Slider'
import { t } from '#/lib/i18n'
import { readStorage, writeStorage } from '#/lib/storage'

import type { StorageKey } from '#/lib/storage'

/*
 * 卡片寬下限是最寬的狀態 badge 加日期與時間仍放得下一列（見 task-browser 版面規則）；
 * 上限避免欄數太少時卡片過大。初始欄數取接近 200px 的卡寬。
 */
const cardWidth = { min: 190, max: 400, initial: 200 }
/* 格狀 gap-3 與 p-2 */
const gridGap = 12
const gridPadding = 16

export type ThumbnailGrid = ReturnType<typeof createThumbnailGrid>

/*
 * 縮圖大小 = 欄數：卡片永遠撐滿寬度，滑桿每一格都換一個欄數。
 * 可選範圍依格狀區寬度算出，偏好的欄數依 storage key 各自記住，寬度變了就夾在範圍內。
 */
export function createThumbnailGrid(storageKey: StorageKey) {
    const [preferred, setPreferred] = createSignal(readStorage(storageKey, z.int().positive()))
    const [width, setWidth] = createSignal(0)
    const columnsFor = (card: number) => Math.floor((width() + gridGap) / (card + gridGap))
    const range = createMemo(() => {
        const max = Math.max(1, columnsFor(cardWidth.min))
        const min = Math.min(max, Math.max(1, Math.ceil((width() + gridGap) / (cardWidth.max + gridGap))))
        return { min, max }
    })
    const columns = () => {
        const { min, max } = range()
        return Math.min(max, Math.max(min, preferred() ?? columnsFor(cardWidth.initial)))
    }

    let observer: ResizeObserver | undefined
    onCleanup(() => observer?.disconnect())

    return {
        /* 格狀捲動區；clientWidth 已扣掉預留的捲軸位置 */
        observe(element: HTMLElement) {
            observer?.disconnect()
            observer = new ResizeObserver(() => setWidth(Math.max(0, element.clientWidth - gridPadding)))
            observer.observe(element)
        },
        /* 量到寬度前先用 auto-fill，避免第一格畫成一欄 */
        template: () => width() > 0
            ? `repeat(${columns()}, minmax(0, 1fr))`
            : `repeat(auto-fill, minmax(${cardWidth.initial}px, 1fr))`,
        range,
        columns,
        setColumns(value: number) {
            setPreferred(value)
            writeStorage(storageKey, value)
        },
    }
}

type ThumbnailSizeSliderProps = {
    grid: ThumbnailGrid
}

/* 往右是放大＝欄數變少，所以滑桿值是反過來的欄數 */
export function ThumbnailSizeSlider(props: ThumbnailSizeSliderProps) {
    const flip = (value: number) => props.grid.range().min + props.grid.range().max - value

    return (
        <div
            title={t('task.thumbnailSize')}
            class='flex w-[112px] shrink-0 items-center gap-2 text-fg-muted'
        >
            <Grid
                class='shrink-0'
                size={13}
                strokeWidth={1.8}
            />
            <Slider
                label={t('task.thumbnailSize')}
                disabled={props.grid.range().min === props.grid.range().max}
                value={flip(props.grid.columns())}
                min={props.grid.range().min}
                max={props.grid.range().max}
                step={1}
                classes={{ root: 'flex-1', track: 'h-1.5', thumb: 'size-3.5' }}
                onChange={value => props.grid.setColumns(flip(value))}
            />
            <Square
                class='shrink-0'
                size={13}
                strokeWidth={1.8}
            />
        </div>
    )
}
