import { Expand, Eye, EyeOff, ImagePlus, X } from 'lucide-solid'
import { createEffect, createMemo, createSignal, For, onCleanup, onMount, Show } from 'solid-js'

import { Bar } from '#/components/base/Bar'
import { Button } from '#/components/base/Button'
import { CenteredText } from '#/components/base/CenteredText'
import { ImagePickerDialog } from '#/components/image/ImagePickerDialog'
import { ImageViewer } from '#/components/viewer/ImageViewer'
import { ZoomControls } from '#/components/viewer/ZoomControls'
import { ZoomStage } from '#/components/viewer/ZoomStage'
import { originLabel } from '#/features/image/image.label'
import { cn } from '#/lib/cn'
import { createImageZoom } from '#/lib/imageZoom'
import { compareStore } from '#/store/compare'
import { overlayStore } from '#/store/overlay'

import type { ImageApi } from '@silent-pix/shared'
import type { CompareEntry } from '#/store/compare'

export function CompareWorkspace() {
    const [pickerOpen, setPickerOpen] = createSignal(false)
    const [expanded, setExpanded] = createSignal(false)
    const [failedImageIds, setFailedImageIds] = createSignal(new Set<string>())
    const zoom = createImageZoom()
    const entries = createMemo(() => compareStore.visibleCompare())
    const allEntries = createMemo(() => compareStore.state.compare)
    const images = createMemo(() => entries().map(entry => ({
        url: entry.image.url,
        width: entry.image.width,
        height: entry.image.height,
    })))
    const selectedIndex = createMemo(() => {
        const selectedId = compareStore.state.selectedCompareImageId
        const index = entries().findIndex(entry => entry.image.id === selectedId)
        return index >= 0 ? index : 0
    })
    const selectedEntry = () => entries()[selectedIndex()]
    const hiddenCount = () => allEntries().length - entries().length

    createEffect(() => {
        const visible = entries()
        const selectedId = compareStore.state.selectedCompareImageId

        if (visible.length > 0 && !visible.some(entry => entry.image.id === selectedId)) {
            const first = visible[0]

            if (first) {
                compareStore.selectCompare(first.image.id)
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
            compareStore.selectCompare(entry.image.id)
        }
    }

    const selectNext = () => {
        if (entries().length < 2) {
            return
        }

        const index = (selectedIndex() + 1) % entries().length
        const entry = entries()[index]
        if (entry) {
            compareStore.selectCompare(entry.image.id)
        }
    }

    const isEditableTarget = (target: EventTarget | null) => {
        if (!(target instanceof HTMLElement)) {
            return false
        }

        return target.isContentEditable
            || target.tagName === 'INPUT'
            || target.tagName === 'TEXTAREA'
            || target.tagName === 'SELECT'
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
        compareStore.addCompare(images.map(item => ({
            image: item.image,
            origin: item.origin,
            hidden: false,
        })))
        setPickerOpen(false)
    }

    const selectViewerImage = (index: number) => {
        const entry = entries()[index]
        if (entry) {
            compareStore.selectCompare(entry.image.id)
        }
    }

    return (
        <section
            class='flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-canvas'
        >
            <Bar.Root classes={{ root: 'border-b border-line-subtle' }}>
                <Bar.Group>
                    <Bar.Title>Compare</Bar.Title>
                    <Bar.Meta classes={{ root: 'tabular-nums' }}>
                        {entries().length} / {allEntries().length} shown
                    </Bar.Meta>
                </Bar.Group>
                <Bar.Actions>
                    <Show when={hiddenCount() > 0}>
                        <Button
                            size='bar'
                            onClick={compareStore.showAllCompare}
                        >
                            Show all
                        </Button>
                    </Show>
                    <Show when={allEntries().length > 0}>
                        <Button
                            size='bar'
                            onClick={compareStore.clearCompare}
                        >
                            Clear
                        </Button>
                    </Show>
                    <Button
                        size='bar'
                        variant='primary'
                        classes={{ root: 'shrink-0 font-semibold' }}
                        onClick={() => setPickerOpen(true)}
                    >
                        <ImagePlus
                            size={14}
                            strokeWidth={1.8}
                        />
                        Add images
                    </Button>
                </Bar.Actions>
            </Bar.Root>

            <Show
                when={allEntries().length > 0}
                fallback={<EmptyCompareState onAdd={() => setPickerOpen(true)} />}
            >
                <Show
                    when={entries().length > 0}
                    fallback={<AllHiddenState onShowAll={compareStore.showAllCompare} />}
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
                                <CurrentCompareImage
                                    entry={entry()}
                                    index={selectedIndex()}
                                />
                            )}
                        </Show>
                        <Button
                            variant='ghost'
                            classes={{ root: 'absolute right-3 top-3 z-10 size-8 rounded-md border border-white/[0.09] bg-surface/75 p-0 text-fg-muted backdrop-blur-[8px] hover:text-fg' }}
                            onClick={() => setExpanded(true)}
                        >
                            <Expand
                                size={15}
                                strokeWidth={1.8}
                            />
                        </Button>
                        <ZoomControls zoom={zoom} />
                    </div>
                </Show>

                <CompareThumbnailStrip
                    entries={allEntries()}
                    failedImageIds={failedImageIds()}
                    selectedId={compareStore.state.selectedCompareImageId}
                    onImageError={imageId => setFailedImageIds(current => new Set([...current, imageId]))}
                    onRemove={compareStore.removeCompare}
                    onSelect={compareStore.selectCompare}
                    onToggleHidden={compareStore.toggleCompareHidden}
                />
            </Show>

            <Show when={expanded() && entries().length > 0}>
                <ImageViewer
                    images={images()}
                    selectedIndex={selectedIndex()}
                    actions={null}
                    header={(
                        <CurrentCompareImage
                            entry={selectedEntry()!}
                            index={selectedIndex()}
                        />
                    )}
                    thumbnailLabel={(_, index) => {
                        const entry = entries()[index]
                        return entry ? originLabel(entry.origin) : null
                    }}
                    onClose={() => setExpanded(false)}
                    onSelect={selectViewerImage}
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
        <div class='relative flex min-h-0 flex-1 items-center justify-center overflow-hidden bg-stage'>
            <div class='flex max-w-[280px] flex-col items-center gap-3 text-center'>
                <div class='grid size-12 place-items-center rounded-xl border border-line-subtle bg-elevated text-fg-muted'>
                    <ImagePlus
                        size={21}
                        strokeWidth={1.5}
                    />
                </div>
                <div class='flex flex-col gap-1'>
                    <h3 class='m-0 text-sm font-medium text-fg'>No images to compare</h3>
                    <p class='m-0 text-xs leading-relaxed text-fg-muted'>
                        Add images from your library to compare them side by side.
                    </p>
                </div>
                <Button
                    variant='primary'
                    classes={{ root: 'mt-1 h-8 px-3 text-xs' }}
                    onClick={props.onAdd}
                >
                    <ImagePlus
                        size={14}
                        strokeWidth={1.8}
                    />
                    Add images
                </Button>
            </div>
        </div>
    )
}

type AllHiddenStateProps = {
    onShowAll: () => void
}

function AllHiddenState(props: AllHiddenStateProps) {
    return (
        <div class='relative flex min-h-0 flex-1 items-center justify-center overflow-hidden bg-stage'>
            <div class='flex flex-col items-center gap-3 text-center'>
                <p class='m-0 text-sm font-medium text-fg'>All images hidden</p>
                <Button
                    variant='primary'
                    classes={{ root: 'h-8 px-3 text-xs' }}
                    onClick={props.onShowAll}
                >
                    Show all
                </Button>
            </div>
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
    return (
        <div class='flex h-20 shrink-0 items-center justify-center gap-2 overflow-x-auto border-t border-white/[0.07] bg-[#101010] px-3 py-2'>
            <For each={props.entries}>
                {(entry, index) => {
                    const selected = () => entry.image.id === props.selectedId
                    const failed = () => props.failedImageIds.has(entry.image.id)
                    const label = () => originLabel(entry.origin) ?? entry.image.id.slice(0, 8)

                    return (
                        <div class='group relative flex h-full w-auto shrink-0'>
                            <Button
                                variant='ghost'
                                classes={{
                                    root: cn(
                                        'relative h-full w-auto shrink-0 overflow-hidden rounded-md border p-0',
                                        selected() ? 'border-accent ring-2 ring-accent' : 'border-transparent',
                                        entry.hidden && 'opacity-40 grayscale',
                                    ),
                                }}
                                onClick={() => props.onSelect(entry.image.id)}
                            >
                                <img
                                    class='h-full w-auto object-contain'
                                    src={entry.image.url}
                                    alt=''
                                    onError={() => props.onImageError(entry.image.id)}
                                />
                                <Show when={failed()}>
                                    <span class='absolute inset-0 grid place-items-center bg-black/60 px-2 text-center text-[10px] text-white/80'>
                                        Unavailable
                                    </span>
                                </Show>
                                <span
                                    class={cn(
                                        'absolute inset-x-0 bottom-0 truncate bg-gradient-to-t from-black/90 to-transparent px-2 pb-1 pt-4 text-left text-[10px] text-white',
                                        entry.hidden && 'line-through',
                                    )}
                                >
                                    {label()}
                                </span>
                                <CenteredText
                                    classes={{
                                        root: 'absolute left-1.5 top-1.5 rounded-md bg-black/75 px-2 py-1 text-[10px] font-semibold text-white/90 shadow-sm ring-1 ring-white/10 tabular-nums backdrop-blur-[3px]',
                                    }}
                                >
                                    {entry.hidden ? '—' : index() + 1}
                                </CenteredText>
                            </Button>
                            <Button
                                variant='ghost'
                                classes={{
                                    root: cn(
                                        'absolute left-1 top-1 z-10 size-6 rounded-md border-0 bg-black/70 p-0 text-white backdrop-blur-[3px]',
                                        entry.hidden ? 'opacity-100' : 'opacity-0 group-hover:opacity-100 focus-visible:opacity-100',
                                    ),
                                }}
                                onClick={() => props.onToggleHidden(entry.image.id)}
                            >
                                {entry.hidden
                                    ? (
                                        <EyeOff
                                            size={13}
                                            strokeWidth={1.8}
                                        />
                                    )
                                    : (
                                        <Eye
                                            size={13}
                                            strokeWidth={1.8}
                                        />
                                    )}
                            </Button>
                            <Button
                                variant='ghost'
                                classes={{ root: 'absolute right-1 top-1 z-10 size-6 rounded-md border-0 bg-black/70 p-0 text-white opacity-0 backdrop-blur-[3px] group-hover:opacity-100 focus-visible:opacity-100 hover:text-red-300' }}
                                onClick={() => props.onRemove(entry.image.id)}
                            >
                                <X
                                    size={13}
                                    strokeWidth={1.9}
                                />
                            </Button>
                        </div>
                    )
                }}
            </For>
        </div>
    )
}

type CurrentCompareImageProps = {
    entry: CompareEntry
    index: number
}

function CurrentCompareImage(props: CurrentCompareImageProps) {
    return (
        <div class='absolute left-3 top-3 z-10 flex max-w-[calc(100%-24px)] items-center gap-2 rounded-md border border-white/[0.09] bg-surface/75 px-2.5 py-1 text-xs text-fg-secondary backdrop-blur-[8px]'>
            <CenteredText
                classes={{
                    root: 'h-4 min-w-4 shrink-0 rounded bg-accent px-1 text-[10px] font-bold text-white',
                }}
            >
                {props.index + 1}
            </CenteredText>
            <span class='truncate'>{originLabel(props.entry.origin) ?? props.entry.image.id.slice(0, 8)}</span>
            <span class='shrink-0 text-fg-muted tabular-nums'>
                · {props.entry.image.width} × {props.entry.image.height}
            </span>
        </div>
    )
}
