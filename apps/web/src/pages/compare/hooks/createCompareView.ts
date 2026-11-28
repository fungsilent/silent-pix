import { createEffect, createMemo, createSignal } from 'solid-js'

import { createHotkeys } from '#/lib/interaction'
import { useCompareSession } from '#/pages/compare/state/session'
import { overlayStore } from '#/store/overlay'

import type { ImageApi } from '@silent-pix/shared'

/* 桌面與手機共用的比較清單檢視：可見項、選取、切換、picker 與載入失敗 */
export function createCompareView() {
    const compareSession = useCompareSession()
    const [pickerOpen, setPickerOpen] = createSignal(false)
    const [failedImageIds, setFailedImageIds] = createSignal(new Set<string>())
    const entries = createMemo(() => compareSession.visibleCompare())
    const allEntries = createMemo(() => compareSession.state.compare)
    const images = createMemo(() => entries().map(entry => ({
        url: entry.image.url,
        width: entry.image.width,
        height: entry.image.height,
    })))
    const selectedIndex = createMemo(() => {
        const selectedId = compareSession.state.selectedCompareImageId
        const index = entries().findIndex(entry => entry.image.id === selectedId)
        return index >= 0 ? index : 0
    })
    const selectedEntry = () => entries()[selectedIndex()]
    const hiddenCount = () => allEntries().length - entries().length
    const position = (imageId: string) => allEntries().findIndex(entry => entry.image.id === imageId) + 1

    /* 移除或清空後忘掉失敗記錄，重新加入時再載一次 */
    createEffect(() => {
        const ids = new Set(allEntries().map(entry => entry.image.id))
        const failed = failedImageIds()
        if ([...failed].some(id => !ids.has(id))) {
            setFailedImageIds(new Set([...failed].filter(id => ids.has(id))))
        }
    })

    createEffect(() => {
        const visible = entries()
        const selectedId = compareSession.state.selectedCompareImageId

        if (visible.length > 0 && !visible.some(entry => entry.image.id === selectedId)) {
            const first = visible[0]

            if (first) {
                compareSession.selectCompare(first.image.id)
            }
        }
    })

    const selectIndex = (index: number) => {
        const entry = entries()[index]
        if (entry) {
            compareSession.selectCompare(entry.image.id)
        }
    }

    const selectPrevious = () => {
        if (entries().length < 2) {
            return
        }

        selectIndex((selectedIndex() - 1 + entries().length) % entries().length)
    }

    const selectNext = () => {
        if (entries().length < 2) {
            return
        }

        selectIndex((selectedIndex() + 1) % entries().length)
    }

    createHotkeys([
        { key: 'ArrowLeft', preventDefault: true, onPress: selectPrevious },
        { key: 'ArrowRight', preventDefault: true, onPress: selectNext },
    ], () => !overlayStore.isActive())

    const applyPickerSelection = (items: ImageApi.ImageListItem[]) => {
        compareSession.addCompare(items.map(item => ({
            image: item.image,
            usage: item.matchedUsage,
            hidden: false,
        })))
        setPickerOpen(false)
    }

    return {
        entries,
        allEntries,
        images,
        selectedIndex,
        selectedEntry,
        hiddenCount,
        position,
        selectIndex,
        selectPrevious,
        selectNext,
        pickerOpen,
        setPickerOpen,
        applyPickerSelection,
        failedImageIds,
        markFailed: (imageId: string) => setFailedImageIds(current => new Set([...current, imageId])),
    }
}

export type CompareView = ReturnType<typeof createCompareView>
