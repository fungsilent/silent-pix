import {
    Check,
    FlagOff,
    ImageDown,
    ImageUp,
    ListFilter,
    Pin,
    RefreshCw,
    Search,
    Trash2,
} from 'lucide-solid'
import { createEffect, createSignal, For, Show } from 'solid-js'

import { Button } from '#/components/base/Button'
import { Dialog } from '#/components/base/Dialog'
import { FilterChips } from '#/components/base/FilterChips'
import { Loading } from '#/components/base/Loading'
import { PanelContent } from '#/components/base/Panel'
import { Text } from '#/components/field'
import { originLabel } from '#/features/image/image.label'
import { useImageListQuery } from '#/features/image/image.query'
import { cn } from '#/lib/cn'

import type { ImageApi, TaskApi } from '@silent-pix/shared'
import type { LucideProps } from 'lucide-solid'
import type { Component } from 'solid-js'

type SharedDialogProps = {
    open: boolean
    onOpenChange: (open: boolean) => void
}

type ImagePickerDialogProps = SharedDialogProps & (
    | {
        mode: 'single'
        onSelect: (image: ImageApi.ImageListItem) => void
    }
    | {
        mode: 'multiple'
        disabledImageIds: string[]
        onSelect: (images: ImageApi.ImageListItem[]) => void
    }
)

const imageSkeletonCells = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]

type ImageType = ImageApi.ImageUsage['type']
type ImageTaskFlag = TaskApi.TaskFilterFlag
const taskFlagOrder: ImageTaskFlag[] = ['unflag', 'pin', 'discard']

type ImageFilterOption<Value extends string> = {
    value: Value
    label: string
    Icon: Component<LucideProps>
}

const allTaskFlagOption = { label: 'All', Icon: ListFilter }

const imageTaskFlagOptions: ImageFilterOption<ImageTaskFlag>[] = [
    { value: 'unflag', label: 'Unflag', Icon: FlagOff },
    { value: 'pin', label: 'Pin', Icon: Pin },
    { value: 'discard', label: 'Discard', Icon: Trash2 },
]

const allImageTypeOption = { label: 'All', Icon: ListFilter }

const imageTypeOptions: ImageFilterOption<ImageType>[] = [
    { value: 'input', label: 'Input', Icon: ImageDown },
    { value: 'output', label: 'Output', Icon: ImageUp },
]

export function ImagePickerDialog(props: ImagePickerDialogProps) {
    const [keyword, setKeyword] = createSignal('')
    const [taskFlags, setTaskFlags] = createSignal<ImageTaskFlag[] | undefined>(
        taskFlagOrder.slice(0, 2),
    )
    const [imageType, setImageType] = createSignal<ImageType[] | undefined>()
    const [selectedSingle, setSelectedSingle] = createSignal<ImageApi.ImageListItem>()
    const [selectedMultiple, setSelectedMultiple] = createSignal<ImageApi.ImageListItem[]>([])
    const query = useImageListQuery(
        () => props.open,
        keyword,
        () => props.mode === 'multiple' ? taskFlags() : undefined,
        () => props.mode === 'multiple' ? imageType()?.[0] : undefined,
    )
    const hasLoadError = () => query.isError && query.data === undefined

    const resetSelection = () => {
        setKeyword('')
        setTaskFlags(taskFlagOrder.slice(0, 2))
        setImageType(undefined)
        setSelectedSingle(undefined)
        setSelectedMultiple([])
    }

    let wasOpen = false

    createEffect(() => {
        if (props.open && !wasOpen) {
            resetSelection()
        }

        wasOpen = props.open
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

            props.onSelect(item)
        }
        else {
            props.onSelect(selectedMultiple())
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
            classes={{
                content: 'h-[100vh] w-[1200px] max-w-[calc(100vw-2rem)]',
                body: 'flex min-h-0 flex-col overflow-hidden',
            }}
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
            <div class='flex min-w-0 flex-col gap-2'>
                <div class='flex min-w-0'>
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
                        classes={{ root: 'min-w-0 flex-1', label: 'sr-only' }}
                        onInput={setKeyword}
                    />
                </div>

                <Show when={props.mode === 'multiple'}>
                    <div class='flex flex-wrap items-center gap-6'>
                        <div class='flex items-center gap-3'>
                            <span class='text-[10px] font-medium uppercase tracking-wide text-fg-title'>
                                Task
                            </span>
                            <FilterChips
                                allOption={allTaskFlagOption}
                                options={imageTaskFlagOptions}
                                values={taskFlags()}
                                onChange={setTaskFlags}
                            />
                        </div>
                        <div class='flex items-center gap-3'>
                            <span class='text-[10px] font-medium uppercase tracking-wide text-fg-title'>
                                Type
                            </span>
                            <FilterChips
                                allOption={allImageTypeOption}
                                options={imageTypeOptions}
                                values={imageType()}
                                onChange={setImageType}
                                selection='single'
                            />
                        </div>
                    </div>
                </Show>
            </div>

            <PanelContent
                classes={{
                    root: '-mx-4 mt-3 flex-auto',
                    content: 'gap-3 p-4 pt-0',
                }}
            >
                <Loading.Swap
                    loading={() => props.open && query.isLoading}
                    fallback={(
                        <div class='grid grid-cols-5 gap-3'>
                            <For each={imageSkeletonCells}>
                                {() => (
                                    <Loading.Skeleton class='aspect-square' />
                                )}
                            </For>
                        </div>
                    )}
                >
                    <Show when={hasLoadError()}>
                        <div class='flex flex-col items-center gap-3 py-8 text-center'>
                            <p class='m-0 text-sm text-red-300'>Failed to load images.</p>
                            <Button
                                type='button'
                                classes={{ root: 'text-sm' }}
                                onClick={() => void query.refetch()}
                            >
                                <RefreshCw
                                    size={14}
                                    strokeWidth={1.8}
                                    aria-hidden='true'
                                />
                                Retry
                            </Button>
                        </div>
                    </Show>

                    <Show when={!hasLoadError()}>
                        <Show
                            when={items().length > 0}
                            fallback={(
                                <p class='m-0 py-8 text-center text-xs text-fg-muted'>
                                    No images yet.
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
                    </Show>
                </Loading.Swap>
            </PanelContent>
        </Dialog>
    )
}
