import { Expand, Eye, EyeOff, ImagePlus, X } from 'lucide-solid'
import { createMemo, createSignal, For, onCleanup, onMount, Show } from 'solid-js'

import { Button } from '#/components/base/Button'
import { cn } from '#/lib/cn'
import { createImageZoom } from '#/lib/imageZoom'
import { ImagePickerDialog } from '#/pages/generate/components/ImagePickerDialog'
import { ImageViewer } from '#/pages/generate/components/workspace/shared/ImageViewer'
import { ZoomControls } from '#/pages/generate/components/workspace/shared/ZoomControls'
import { ZoomStage } from '#/pages/generate/components/workspace/shared/ZoomStage'
import { workspaceStore } from '#/store/workspace'

import type { CompareCandidate } from '#/pages/generate/components/ImagePickerDialog'
import type { CompareEntry } from '#/store/workspace'

export function CompareWorkspace() {
    const [pickerOpen, setPickerOpen] = createSignal(false)
    const [expanded, setExpanded] = createSignal(false)
    const [failedImageIds, setFailedImageIds] = createSignal(new Set<string>())
    const zoom = createImageZoom()
    const entries = createMemo(() => workspaceStore.visibleCompare())
    const allEntries = createMemo(() => workspaceStore.state.compare)
    const images = createMemo(() => entries().map(entry => ({
        url: entry.url,
        width: entry.width,
        height: entry.height,
    })))
    const selectedIndex = createMemo(() => {
        const selectedId = workspaceStore.state.selectedCompareImageId
        const index = entries().findIndex(entry => entry.imageId === selectedId)
        return index >= 0 ? index : 0
    })
    const selectedEntry = () => entries()[selectedIndex()]
    const hiddenCount = () => allEntries().length - entries().length

    const selectPrevious = () => {
        if (entries().length < 2) {
            return
        }

        const index = (selectedIndex() - 1 + entries().length) % entries().length
        const entry = entries()[index]
        if (entry) {
            workspaceStore.selectCompare(entry.imageId)
        }
    }

    const selectNext = () => {
        if (entries().length < 2) {
            return
        }

        const index = (selectedIndex() + 1) % entries().length
        const entry = entries()[index]
        if (entry) {
            workspaceStore.selectCompare(entry.imageId)
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
            workspaceStore.state.modalDepth > 0
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

    const applyPickerSelection = (candidates: CompareCandidate[]) => {
        workspaceStore.addCompare(candidates.map(candidate => ({
            url: candidate.image.url,
            width: candidate.image.width,
            height: candidate.image.height,
            imageId: candidate.image.id,
            originLabel: candidate.originLabel,
            hidden: false,
        })))
        setPickerOpen(false)
    }

    const selectViewerImage = (index: number) => {
        const entry = entries()[index]
        if (entry) {
            workspaceStore.selectCompare(entry.imageId)
        }
    }

    return (
        <section
            class='flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-canvas'
            aria-label='Compare workspace'
        >
            <header class='flex min-h-12 shrink-0 items-center justify-between gap-3 border-b border-line-subtle bg-surface px-4 py-2'>
                <div class='flex min-w-0 items-baseline gap-2'>
                    <h2 class='m-0 text-sm font-bold leading-none text-fg'>Compare</h2>
                    <span class='text-[11.5px] tabular-nums text-fg-muted'>
                        {entries().length} / {allEntries().length} shown
                    </span>
                </div>
                <div class='flex shrink-0 items-center gap-2'>
                    <Show when={hiddenCount() > 0}>
                        <Button
                            classes={{ root: 'h-[30px] px-3 text-xs' }}
                            onClick={workspaceStore.showAllCompare}
                        >
                            Show all
                        </Button>
                    </Show>
                    <Show when={allEntries().length > 0}>
                        <Button
                            classes={{ root: 'h-[30px] px-3 text-xs' }}
                            onClick={workspaceStore.clearCompare}
                        >
                            Clear
                        </Button>
                    </Show>
                    <Button
                        variant='primary'
                        classes={{ root: 'shrink-0 px-4 text-sm font-bold' }}
                        onClick={() => setPickerOpen(true)}
                    >
                        <ImagePlus
                            size={14}
                            strokeWidth={1.8}
                            aria-hidden='true'
                        />
                        Add images
                    </Button>
                </div>
            </header>

            <Show
                when={allEntries().length > 0}
                fallback={<EmptyCompareState onAdd={() => setPickerOpen(true)} />}
            >
                <Show
                    when={entries().length > 0}
                    fallback={<AllHiddenState onShowAll={workspaceStore.showAllCompare} />}
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
                            aria-label='Expand compare viewer'
                            classes={{ root: 'absolute right-3 top-3 z-10 size-8 rounded-md border border-white/[0.09] bg-surface/75 p-0 text-fg-muted backdrop-blur-[8px] hover:text-fg' }}
                            onClick={() => setExpanded(true)}
                        >
                            <Expand
                                size={15}
                                strokeWidth={1.8}
                                aria-hidden='true'
                            />
                        </Button>
                        <ZoomControls zoom={zoom} />
                    </div>
                </Show>

                <CompareThumbnailStrip
                    entries={allEntries()}
                    failedImageIds={failedImageIds()}
                    selectedId={workspaceStore.state.selectedCompareImageId}
                    onImageError={imageId => setFailedImageIds(current => new Set([...current, imageId]))}
                    onRemove={workspaceStore.removeCompare}
                    onSelect={workspaceStore.selectCompare}
                    onToggleHidden={workspaceStore.toggleCompareHidden}
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
                    thumbnailLabel={(_, index) => entries()[index]?.originLabel ?? null}
                    onClose={() => setExpanded(false)}
                    onSelect={selectViewerImage}
                />
            </Show>

            <ImagePickerDialog
                mode='multiple'
                open={pickerOpen()}
                disabledImageIds={allEntries().map(entry => entry.imageId)}
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
                        aria-hidden='true'
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
                        aria-hidden='true'
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
                    const selected = () => entry.imageId === props.selectedId
                    const failed = () => props.failedImageIds.has(entry.imageId)

                    return (
                        <div class='group relative flex h-full w-auto shrink-0'>
                            <Button
                                variant='ghost'
                                aria-label={`Show ${entry.originLabel ?? entry.imageId.slice(0, 8)}`}
                                aria-pressed={selected()}
                                classes={{
                                    root: cn(
                                        'relative h-full w-auto shrink-0 overflow-hidden rounded-md border p-0',
                                        selected() ? 'border-accent ring-2 ring-accent' : 'border-transparent',
                                        entry.hidden && 'opacity-40 grayscale',
                                    ),
                                }}
                                onClick={() => props.onSelect(entry.imageId)}
                            >
                                <img
                                    class='h-full w-auto object-contain'
                                    src={entry.url}
                                    alt=''
                                    onError={() => props.onImageError(entry.imageId)}
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
                                    {entry.originLabel ?? entry.imageId.slice(0, 8)}
                                </span>
                                <span class='absolute left-1.5 top-1.5 rounded bg-black/70 px-1.5 text-[10px] font-bold tabular-nums text-white'>
                                    {entry.hidden ? '—' : index() + 1}
                                </span>
                            </Button>
                            <Button
                                variant='ghost'
                                aria-label={entry.hidden ? 'Show image' : 'Hide image'}
                                classes={{
                                    root: cn(
                                        'absolute left-1 top-1 z-10 size-6 rounded-md border-0 bg-black/70 p-0 text-white backdrop-blur-[3px]',
                                        entry.hidden ? 'opacity-100' : 'opacity-0 group-hover:opacity-100 focus-visible:opacity-100',
                                    ),
                                }}
                                onClick={() => props.onToggleHidden(entry.imageId)}
                            >
                                {entry.hidden
                                    ? (
                                        <EyeOff
                                            size={13}
                                            strokeWidth={1.8}
                                            aria-hidden='true'
                                        />
                                    )
                                    : (
                                        <Eye
                                            size={13}
                                            strokeWidth={1.8}
                                            aria-hidden='true'
                                        />
                                    )}
                            </Button>
                            <Button
                                variant='ghost'
                                aria-label='Remove image'
                                classes={{ root: 'absolute right-1 top-1 z-10 size-6 rounded-md border-0 bg-black/70 p-0 text-white opacity-0 backdrop-blur-[3px] group-hover:opacity-100 focus-visible:opacity-100 hover:text-red-300' }}
                                onClick={() => props.onRemove(entry.imageId)}
                            >
                                <X
                                    size={13}
                                    strokeWidth={1.9}
                                    aria-hidden='true'
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
            <span class='grid size-4 shrink-0 place-items-center rounded bg-accent text-[10px] font-bold text-white'>
                {props.index + 1}
            </span>
            <span class='truncate'>{props.entry.originLabel ?? props.entry.imageId.slice(0, 8)}</span>
            <span class='shrink-0 text-fg-muted tabular-nums'>
                · {props.entry.width} × {props.entry.height}
            </span>
        </div>
    )
}
