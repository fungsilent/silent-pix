import { ImagePlus } from 'lucide-solid'
import { createMemo, createSignal, For, onCleanup, onMount, Show } from 'solid-js'

import { Button } from '#/components/base/Button'
import { createImageZoom } from '#/lib/imageZoom'
import { ImagePickerDialog } from '#/pages/generate/components/ImagePickerDialog'
import { ZoomControls } from '#/pages/generate/components/workspace/shared/ZoomControls'
import { ZoomStage } from '#/pages/generate/components/workspace/shared/ZoomStage'
import { workspaceStore } from '#/store/workspace'

import type { CompareCandidate } from '#/pages/generate/components/ImagePickerDialog'
import type { CompareEntry } from '#/store/workspace'

export function CompareWorkspace() {
    const [pickerOpen, setPickerOpen] = createSignal(false)
    const zoom = createImageZoom()
    const entries = createMemo(() => workspaceStore.visibleCompare())
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

    return (
        <section
            class='flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-canvas'
            aria-label='Compare workspace'
        >
            <header class='flex min-h-12 shrink-0 items-center justify-between gap-3 border-b border-line-subtle bg-surface px-4 py-2'>
                <div class='flex min-w-0 items-baseline gap-2'>
                    <h2 class='m-0 text-sm font-bold leading-none text-fg'>Compare</h2>
                    <span class='text-[11.5px] tabular-nums text-fg-muted'>
                        {entries().length === 0 ? '0 / 0 shown' : `${entries().length} / ${entries().length} shown`}
                    </span>
                </div>
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
            </header>

            <Show
                when={entries().length > 0}
                fallback={(
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
                    </div>
                )}
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
                    <ZoomControls zoom={zoom} />
                </div>

                <div class='flex h-20 shrink-0 items-center justify-center gap-2 overflow-x-auto border-t border-white/[0.07] bg-[#101010] px-3 py-2'>
                    <For each={entries()}>
                        {(entry, index) => (
                            <Button
                                variant='ghost'
                                aria-label={`Show ${entry.originLabel ?? entry.imageId.slice(0, 8)}`}
                                aria-pressed={entry.imageId === workspaceStore.state.selectedCompareImageId}
                                classes={{
                                    root: `relative h-full w-auto shrink-0 overflow-hidden rounded-md border p-0 ${entry.imageId === workspaceStore.state.selectedCompareImageId ? 'border-accent ring-2 ring-accent' : 'border-transparent opacity-60 hover:opacity-100'}`,
                                }}
                                onClick={() => workspaceStore.selectCompare(entry.imageId)}
                            >
                                <img
                                    class='h-full w-auto object-contain'
                                    src={entry.url}
                                    alt=''
                                />
                                <span class='absolute inset-x-0 bottom-0 truncate bg-gradient-to-t from-black/90 to-transparent px-2 pb-1 pt-4 text-left text-[10px] text-white'>
                                    {entry.originLabel ?? entry.imageId.slice(0, 8)}
                                </span>
                                <span class='absolute left-1.5 top-1.5 rounded bg-black/70 px-1.5 text-[10px] font-bold tabular-nums text-white'>
                                    {index() + 1}
                                </span>
                            </Button>
                        )}
                    </For>
                </div>
            </Show>

            <ImagePickerDialog
                mode='multiple'
                open={pickerOpen()}
                disabledImageIds={workspaceStore.state.compare.map(entry => entry.imageId)}
                onOpenChange={setPickerOpen}
                onSelect={applyPickerSelection}
            />
        </section>
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
