import { Check, Search } from 'lucide-solid'
import { createEffect, createSignal, For, onCleanup, Show } from 'solid-js'

import { Button } from '#/components/base/Button'
import { Dialog } from '#/components/base/Dialog'
import { Text } from '#/components/field'
import { useImageListQuery } from '#/features/image/image.query'
import { cn } from '#/lib/cn'
import { originLabel } from '#/pages/generate/label'
import { workspaceStore } from '#/store/workspace'

import type { ImageApi } from '@silent-pix/shared'
import type { ReferenceImage } from '#/pages/generate/store'

type SharedDialogProps = {
    open: boolean
    onOpenChange: (open: boolean) => void
}

export type CompareCandidate = {
    image: ImageApi.ImageResource
    originLabel: string | null
}

export type ImagePickerDialogProps = SharedDialogProps & (
    | {
        mode: 'single'
        onSelect: (reference: ReferenceImage) => void
    }
    | {
        mode: 'multiple'
        disabledImageIds: string[]
        onSelect: (images: CompareCandidate[]) => void
    }
)

export function ImagePickerDialog(props: ImagePickerDialogProps) {
    const [keyword, setKeyword] = createSignal('')
    const [selectedSingle, setSelectedSingle] = createSignal<ImageApi.ImageListItem>()
    const [selectedMultiple, setSelectedMultiple] = createSignal<ImageApi.ImageListItem[]>([])
    const query = useImageListQuery(() => props.open, keyword)
    let modalOpen = false

    createEffect(() => {
        if (props.open) {
            setKeyword('')
            setSelectedSingle(undefined)
            setSelectedMultiple([])

            if (!modalOpen) {
                workspaceStore.openModal()
                modalOpen = true
            }
        }
        else if (modalOpen) {
            workspaceStore.closeModal()
            modalOpen = false
        }
    })

    onCleanup(() => {
        if (modalOpen) {
            workspaceStore.closeModal()
        }
    })

    const items = () => query.data?.pages.flatMap(page => page.items) ?? []

    const isSelected = (item: ImageApi.ImageListItem) => props.mode === 'single'
        ? selectedSingle()?.image.id === item.image.id
        : selectedMultiple().some(selected => selected.image.id === item.image.id)

    const isDisabled = (item: ImageApi.ImageListItem) => props.mode === 'multiple'
        && props.disabledImageIds.includes(item.image.id)

    const selectionNumber = (item: ImageApi.ImageListItem) => (
        selectedMultiple().findIndex(selected => selected.image.id === item.image.id) + 1
    )

    const toggle = (item: ImageApi.ImageListItem) => {
        if (props.mode === 'single') {
            setSelectedSingle(item)
            return
        }

        if (isDisabled(item)) {
            return
        }

        setSelectedMultiple(current => current.some(selected => selected.image.id === item.image.id)
            ? current.filter(selected => selected.image.id !== item.image.id)
            : [...current, item])
    }

    const apply = () => {
        if (props.mode === 'single') {
            const item = selectedSingle()
            if (!item) {
                return
            }

            props.onSelect({ type: 'asset', image: item.image, origin: item.origin })
        }
        else {
            props.onSelect(selectedMultiple().map(item => ({
                image: item.image,
                originLabel: originLabel(item.origin),
            })))
        }

        props.onOpenChange(false)
    }

    const hasSelection = () => props.mode === 'single'
        ? Boolean(selectedSingle())
        : selectedMultiple().length > 0

    return (
        <Dialog
            open={props.open}
            title={props.mode === 'multiple' ? 'Add images to compare' : 'Choose reference image'}
            onOpenChange={props.onOpenChange}
            classes={{ content: 'w-[960px] max-w-full', body: 'min-h-0' }}
            footer={(
                <div class='flex w-full items-center gap-3'>
                    <Show
                        when={props.mode === 'single' && selectedSingle()}
                        fallback={(
                            <Show when={props.mode === 'multiple' && selectedMultiple().length > 0}>
                                <span class='text-xs text-fg-secondary'>
                                    {selectedMultiple().length} selected
                                </span>
                            </Show>
                        )}
                    >
                        {item => (
                            <span class='min-w-0 truncate text-xs text-fg-secondary'>
                                {item().image.width} × {item().image.height}
                            </span>
                        )}
                    </Show>
                    <div class='ml-auto flex shrink-0 gap-2'>
                        <Button
                            classes={{ root: 'min-w-20 text-sm' }}
                            onClick={() => props.onOpenChange(false)}
                        >
                            Cancel
                        </Button>
                        <Button
                            variant='primary'
                            disabled={!hasSelection()}
                            classes={{ root: 'min-w-20 text-sm' }}
                            onClick={apply}
                        >
                            Apply
                        </Button>
                    </div>
                </div>
            )}
        >
            <div class='flex min-h-0 flex-col gap-3'>
                <Text
                    label='Search'
                    value={keyword()}
                    placeholder='task name or task ID...'
                    icon={(
                        <Search
                            size={14}
                            strokeWidth={1.7}
                            aria-hidden='true'
                        />
                    )}
                    classes={{ label: 'sr-only' }}
                    onInput={setKeyword}
                />

                <Show
                    when={items().length > 0}
                    fallback={(
                        <p class='m-0 py-8 text-center text-xs text-fg-muted'>
                            {query.isLoading ? 'Loading images...' : 'No images yet.'}
                        </p>
                    )}
                >
                    <div class='grid grid-cols-5 gap-3'>
                        <For each={items()}>
                            {item => {
                                const disabled = () => isDisabled(item)
                                const selected = () => isSelected(item)

                                return (
                                    <Button
                                        variant='ghost'
                                        aria-label={`Select ${originLabel(item.origin) ?? item.image.id.slice(0, 8)}`}
                                        aria-pressed={selected()}
                                        disabled={disabled()}
                                        classes={{
                                            root: cn(
                                                'group relative aspect-square overflow-hidden rounded-md border bg-active p-0',
                                                selected()
                                                    ? 'border-accent ring-2 ring-accent/40'
                                                    : 'border-transparent hover:border-white/20',
                                                disabled() && 'cursor-not-allowed opacity-40 grayscale',
                                            ),
                                        }}
                                        onClick={() => toggle(item)}
                                    >
                                        <img
                                            class='absolute inset-0 size-full object-cover'
                                            src={item.image.url}
                                            alt=''
                                            loading='lazy'
                                        />
                                        <Show when={item.origin}>
                                            {origin => (
                                                <>
                                                    <span class='absolute left-1.5 top-1.5 rounded bg-black/70 px-1.5 text-[9.5px] font-bold uppercase tracking-wide text-white/75 backdrop-blur-[3px]'>
                                                        {origin().type}
                                                    </span>
                                                    <span class='absolute inset-x-0 bottom-0 truncate bg-gradient-to-t from-black/85 to-transparent px-2 pb-1.5 pt-4 text-left text-[11px] text-white'>
                                                        {originLabel(origin())}
                                                    </span>
                                                </>
                                            )}
                                        </Show>
                                        <Show when={props.mode === 'multiple' && selected()}>
                                            <span class='absolute right-1.5 top-1.5 grid size-5 place-items-center rounded-full bg-accent text-[10px] font-bold text-white shadow-sm'>
                                                {selectionNumber(item)}
                                            </span>
                                        </Show>
                                        <Show when={props.mode === 'multiple' && disabled()}>
                                            <span class='absolute inset-0 grid place-items-center bg-black/25'>
                                                <Check
                                                    size={22}
                                                    strokeWidth={2.5}
                                                    class='text-white/80'
                                                    aria-hidden='true'
                                                />
                                            </span>
                                        </Show>
                                    </Button>
                                )
                            }}
                        </For>
                    </div>

                    <Show when={query.hasNextPage}>
                        <Button
                            classes={{ root: 'w-full' }}
                            disabled={query.isFetchingNextPage}
                            onClick={() => void query.fetchNextPage()}
                        >
                            {query.isFetchingNextPage ? 'Loading...' : 'Load more'}
                        </Button>
                    </Show>
                </Show>
            </div>
        </Dialog>
    )
}
