import { Eye, EyeOff, ImageOff, ImagePlus, ListX, X } from 'lucide-solid'
import { createEffect, createMemo, createSignal, For, onCleanup, onMount, Show } from 'solid-js'

import { Bar } from '#/components/base/Bar'
import { Button } from '#/components/base/Button'
import { CenteredText } from '#/components/base/CenteredText'
import { StatusMessage } from '#/components/base/StatusMessage'
import { ImagePickerDialog } from '#/components/image/ImagePickerDialog'
import { ZoomControls } from '#/components/viewer/ZoomControls'
import { ZoomStage } from '#/components/viewer/ZoomStage'
import { resolveImageUrl } from '#/data/image/image.api'
import { t } from '#/lib/i18n'
import { createImageZoom } from '#/lib/image-zoom'
import { isEditableTarget } from '#/lib/keyboard'
import { theme } from '#/lib/theme'
import { useCompareSession } from '#/pages/compare/state/session'
import { overlayStore } from '#/store/overlay'
import { mergeClasses } from '#/utils/style'

import type { ImageApi } from '@silent-pix/shared'
import type { CompareEntry } from '#/pages/compare/state/session'

export function CompareWorkspace() {
    const compareSession = useCompareSession()
    const [pickerOpen, setPickerOpen] = createSignal(false)
    const [failedImageIds, setFailedImageIds] = createSignal(new Set<string>())
    const zoom = createImageZoom()
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

    const selectPrevious = () => {
        if (entries().length < 2) {
            return
        }

        const index = (selectedIndex() - 1 + entries().length) % entries().length
        const entry = entries()[index]
        if (entry) {
            compareSession.selectCompare(entry.image.id)
        }
    }

    const selectNext = () => {
        if (entries().length < 2) {
            return
        }

        const index = (selectedIndex() + 1) % entries().length
        const entry = entries()[index]
        if (entry) {
            compareSession.selectCompare(entry.image.id)
        }
    }

    const handleKeyDown = (event: KeyboardEvent) => {
        if (
            overlayStore.isActive()
            || event.defaultPrevented
            || event.ctrlKey
            || event.metaKey
            || event.altKey
            || isEditableTarget(event.target)
        ) {
            return
        }

        if (event.key === 'ArrowLeft') {
            event.preventDefault()
            selectPrevious()
            return
        }

        if (event.key === 'ArrowRight') {
            event.preventDefault()
            selectNext()
        }
    }

    onMount(() => window.addEventListener('keydown', handleKeyDown))
    onCleanup(() => window.removeEventListener('keydown', handleKeyDown))

    const applyPickerSelection = (images: ImageApi.ImageListItem[]) => {
        compareSession.addCompare(images.map(item => ({
            image: item.image,
            usage: item.matchedUsage,
            hidden: false,
        })))
        setPickerOpen(false)
    }


    return (
        <section
            class={mergeClasses(theme.card, 'flex min-h-0 min-w-0 flex-1 flex-col bg-canvas')}
        >
            <Show
                when={allEntries().length > 0}
                fallback={<EmptyCompareState onAdd={() => setPickerOpen(true)} />}
            >
                <Bar.Root classes={{ root: 'border-b border-line-subtle' }}>
                    <span class='min-w-0 truncate text-xs leading-none text-fg-secondary tabular-nums'>
                        {t('compare.shownCount', { shown: entries().length, total: allEntries().length })}
                    </span>
                    <Bar.Actions classes={{ root: 'shrink-0' }}>
                        <Show when={hiddenCount() > 0 && entries().length > 0}>
                            <Button
                                variant='ghost'
                                title={t('common.showAll')}
                                classes={{ root: 'size-7 shrink-0 p-0' }}
                                onClick={compareSession.showAllCompare}
                            >
                                <Eye
                                    size={16}
                                    strokeWidth={1.8}
                                />
                            </Button>
                        </Show>
                        <Button
                            variant='ghost'
                            title={t('compare.clearList')}
                            classes={{ root: 'size-7 shrink-0 p-0' }}
                            onClick={compareSession.clearCompare}
                        >
                            <ListX
                                size={16}
                                strokeWidth={1.8}
                            />
                        </Button>
                        <Button
                            variant='solid'
                            tone='accent'
                            title={t('image.add')}
                            classes={{ root: 'size-7 shrink-0 p-0' }}
                            onClick={() => setPickerOpen(true)}
                        >
                            <ImagePlus
                                size={16}
                                strokeWidth={1.8}
                            />
                        </Button>
                    </Bar.Actions>
                </Bar.Root>

                <Show
                    when={entries().length > 0}
                    fallback={<AllHiddenState onShowAll={compareSession.showAllCompare} />}
                >
                    <div class='relative flex min-h-0 flex-1 flex-col overflow-hidden bg-stage'>
                        <ZoomStage
                            images={images()}
                            selectedIndex={selectedIndex()}
                            zoom={zoom}
                            onClick={() => undefined}
                        />
                        <Show when={selectedEntry()}>
                            {entry => (
                                <CenteredText classes={{ root: 'absolute left-3 top-3 z-10 h-6 min-w-6 rounded-md bg-accent px-1.5 text-xs font-bold text-on-stage tabular-nums shadow-sm' }}>
                                    {position(entry().image.id)}
                                </CenteredText>
                            )}
                        </Show>
                        <ZoomControls zoom={zoom} />
                    </div>
                </Show>

                <CompareThumbnailStrip
                    entries={allEntries()}
                    failedImageIds={failedImageIds()}
                    selectedId={compareSession.state.selectedCompareImageId}
                    onImageError={imageId => setFailedImageIds(current => new Set([...current, imageId]))}
                    onRemove={compareSession.removeCompare}
                    onSelect={compareSession.selectCompare}
                    onToggleHidden={compareSession.toggleCompareHidden}
                />
            </Show>

            <ImagePickerDialog
                mode='multiple'
                open={pickerOpen()}
                disabledImageIds={allEntries().map(entry => entry.image.id)}
                onOpenChange={setPickerOpen}
                onSelect={applyPickerSelection}
            />
        </section>
    )
}

type EmptyCompareStateProps = {
    onAdd: () => void
}

function EmptyCompareState(props: EmptyCompareStateProps) {
    return (
        <div class='relative flex min-h-0 flex-1 items-center justify-center bg-surface px-4'>
            <StatusMessage
                kind='empty'
                title={t('compare.emptyTitle')}
                message={t('compare.emptyMessage')}
                icon={(
                    <ImagePlus
                        size={21}
                        strokeWidth={1.5}
                    />
                )}
                action={{
                    label: t('image.add'),
                    icon: (
                        <ImagePlus
                            size={14}
                            strokeWidth={1.8}
                        />
                    ),
                    onClick: props.onAdd,
                }}
            />
        </div>
    )
}

type AllHiddenStateProps = {
    onShowAll: () => void
}

function AllHiddenState(props: AllHiddenStateProps) {
    return (
        <div class='relative flex min-h-0 flex-1 items-center justify-center overflow-hidden bg-stage-empty px-4'>
            <StatusMessage
                kind='empty'
                title={t('compare.allHidden')}
                action={{
                    label: t('common.showAll'),
                    icon: (
                        <Eye
                            size={14}
                            strokeWidth={1.8}
                        />
                    ),
                    onClick: props.onShowAll,
                }}
            />
        </div>
    )
}

type CompareThumbnailStripProps = {
    entries: CompareEntry[]
    failedImageIds: Set<string>
    selectedId: string | null
    onImageError: (imageId: string) => void
    onRemove: (imageId: string) => void
    onSelect: (imageId: string) => void
    onToggleHidden: (imageId: string) => void
}

function CompareThumbnailStrip(props: CompareThumbnailStripProps) {
    const corner = 'absolute top-1 z-10 h-[18px] min-w-[18px] rounded border-0 px-1 py-0 text-[10px] font-bold leading-none tabular-nums backdrop-blur-[3px]'

    return (
        <div class='flex h-20 shrink-0 items-center justify-center-safe gap-2 overflow-x-auto border-t border-stage-line-subtle bg-stage-strip px-3 py-2'>
            <For each={props.entries}>
                {(entry, index) => {
                    const selected = () => entry.image.id === props.selectedId

                    return (
                        <div class='group relative flex h-full w-auto shrink-0'>
                            <Button
                                variant='ghost'
                                classes={{
                                    root: mergeClasses(
                                        'relative h-full w-auto shrink-0 overflow-hidden rounded-md p-0',
                                        selected() && 'ring-2 ring-stage-fg',
                                    ),
                                }}
                                onClick={() => props.onSelect(entry.image.id)}
                            >
                                <img
                                    class={mergeClasses('h-full w-auto object-contain', entry.hidden && 'opacity-40 grayscale')}
                                    src={resolveImageUrl(entry.image.url)}
                                    alt=''
                                    onError={() => props.onImageError(entry.image.id)}
                                />
                                <Show when={props.failedImageIds.has(entry.image.id)}>
                                    <span class='absolute inset-0 grid place-items-center bg-stage-control text-stage-overlay-text'>
                                        <ImageOff
                                            size={16}
                                            strokeWidth={1.8}
                                        />
                                    </span>
                                </Show>
                            </Button>
                            {/* 序號角兼隱藏切換：hover 時換成 eye-off；已隱藏的常駐 eye-off，點擊恢復 */}
                            <Button
                                variant='ghost'
                                classes={{
                                    root: mergeClasses(
                                        corner,
                                        'left-1 group-hover:bg-stage-control-hover group-hover:text-on-stage group-hover:ring-0',
                                        selected() ? 'bg-accent text-on-stage hover:bg-accent' : 'bg-stage-overlay text-stage-overlay-label ring-1 ring-stage-ring hover:bg-stage-overlay',
                                    ),
                                }}
                                onClick={() => props.onToggleHidden(entry.image.id)}
                            >
                                <Show when={!entry.hidden}>
                                    <span class='group-hover:hidden'>{index() + 1}</span>
                                </Show>
                                <EyeOff
                                    class={entry.hidden ? '' : 'hidden group-hover:block'}
                                    size={11}
                                    strokeWidth={1.8}
                                />
                            </Button>
                            <Button
                                variant='ghost'
                                classes={{ root: mergeClasses(corner, 'right-1 size-[18px] bg-stage-control-hover p-0 text-on-stage opacity-0 group-hover:opacity-100 focus-visible:opacity-100 hover:bg-stage-control-hover hover:text-stage-danger') }}
                                onClick={() => props.onRemove(entry.image.id)}
                            >
                                <X
                                    size={11}
                                    strokeWidth={1.8}
                                />
                            </Button>
                        </div>
                    )
                }}
            </For>
        </div>
    )
}
