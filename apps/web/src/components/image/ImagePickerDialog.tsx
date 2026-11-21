import {
    Check,
    FlagOff,
    FlagTriangleRight,
    HeartX,
    Images,
    ListFilter,
    Search,
    X,
} from 'lucide-solid'
import { createEffect, createSignal, For, Show } from 'solid-js'

import { resolveImageUrl } from '#/api/image'
import { Button } from '#/components/base/Button'
import { Dialog } from '#/components/base/Dialog'
import { FilterChips } from '#/components/base/FilterChips'
import { Loading } from '#/components/base/Loading'
import { SelectedCountChip } from '#/components/base/SelectedCountChip'
import { StatusMessage } from '#/components/base/StatusMessage'
import { Text } from '#/components/field'
import { ImageTypeBadge } from '#/components/image/ImageTypeBadge'
import { createThumbnailGrid, ThumbnailSizeSlider } from '#/components/image/ThumbnailSize'
import { TaskFlagOverlay } from '#/components/task/TaskFlagOverlay'
import { originLabel } from '#/features/image/image.label'
import { useImageListQuery } from '#/features/image/image.query'
import { cn } from '#/lib/cn'
import { t } from '#/lib/i18n'
import { createLoadOnScroll } from '#/lib/loadOnScroll'

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
const nextPageSkeletonCells = [0, 1, 2, 3]

type ImageType = ImageApi.ImageUsage['type']
type ImageTaskFlag = TaskApi.TaskFilterFlag

type ImageFilterOption<Value extends string> = {
    value: Value
    label: () => string
    Icon: Component<LucideProps>
}

const allTaskFlagOption = { label: () => t('common.all'), Icon: ListFilter }

const imageTaskFlagOptions: ImageFilterOption<ImageTaskFlag>[] = [
    { value: 'unflag', label: () => t('task.filter.unflag'), Icon: FlagOff },
    { value: 'pin', label: () => t('task.filter.pin'), Icon: FlagTriangleRight },
    { value: 'discard', label: () => t('task.filter.discard'), Icon: HeartX },
]

function typeMark(text: string): Component<LucideProps> {
    return () => <span class='text-[9px] font-semibold uppercase leading-none tracking-wide'>{text}</span>
}

const allImageTypeOption = { label: () => t('common.all'), Icon: ListFilter }

const imageTypeOptions: ImageFilterOption<ImageType>[] = [
    { value: 'input', label: () => t('image.input'), Icon: typeMark('in') },
    { value: 'output', label: () => t('image.output'), Icon: typeMark('out') },
]

export function ImagePickerDialog(props: ImagePickerDialogProps) {
    const [keyword, setKeyword] = createSignal('')
    const [taskFlags, setTaskFlags] = createSignal<ImageTaskFlag[] | undefined>()
    const [imageType, setImageType] = createSignal<ImageType[] | undefined>()
    const [selectedSingle, setSelectedSingle] = createSignal<ImageApi.ImageListItem>()
    const [selectedMultiple, setSelectedMultiple] = createSignal<ImageApi.ImageListItem[]>([])
    const query = useImageListQuery(
        () => props.open,
        keyword,
        taskFlags,
        () => imageType()?.[0],
    )
    const hasLoadError = () => query.isError && query.data === undefined
    const thumbnailGrid = createThumbnailGrid('silent-pix.image-picker-columns')
    const gridStyle = () => ({ 'grid-template-columns': thumbnailGrid.template() })
    const loadOnScroll = createLoadOnScroll({
        canLoad: () => props.open && query.hasNextPage && !query.isFetching && !query.isError,
        load: () => void query.fetchNextPage(),
    })

    const resetSelection = () => {
        setKeyword('')
        setTaskFlags(undefined)
        setImageType(undefined)
        setSelectedSingle(undefined)
        setSelectedMultiple([])
    }

    const changeImageType = (values: ImageType[] | undefined) => {
        setImageType(values)
        if (values?.[0] === 'input') {
            setTaskFlags(undefined)
        }
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

    const clearSelection = () => {
        setSelectedSingle(undefined)
        setSelectedMultiple([])
    }

    const hasSelection = () => props.mode === 'single'
        ? Boolean(selectedSingle())
        : selectedMultiple().length > 0

    return (
        <Dialog
            open={props.open}
            title={props.mode === 'multiple' ? t('image.addToCompare') : t('image.chooseReference')}
            onOpenChange={props.onOpenChange}
            classes={{
                content: 'h-[100vh] w-[1600px] max-w-[calc(100vw-2rem)]',
                header: 'h-12 items-center py-0',
                title: 'text-sm font-semibold leading-none',
                body: 'flex overflow-hidden p-0',
                footer: 'h-12 items-center py-0',
            }}
            footer={(
                <Button
                    variant='solid'
                    tone='accent'
                    disabled={!hasSelection()}
                    size='dialog'
                    onClick={apply}
                >
                    {t('common.apply')}
                </Button>
            )}
        >
            <nav class='flex w-10 shrink-0 flex-col items-center border-r border-line-subtle'>
                <div class='h-12 shrink-0' />
                <fieldset
                    disabled={imageType()?.[0] === 'input'}
                    class='m-0 flex min-w-0 flex-col items-center border-0 p-0 disabled:opacity-60'
                >
                    <FilterChips
                        allOption={allTaskFlagOption}
                        options={imageTaskFlagOptions}
                        values={taskFlags()}
                        onChange={setTaskFlags}
                        presentation='icon'
                        classes={{ root: 'flex-col' }}
                    />
                </fieldset>
                <div class='my-1 h-px w-5 bg-line-subtle' />
                <FilterChips
                    allOption={allImageTypeOption}
                    options={imageTypeOptions}
                    values={imageType()}
                    onChange={changeImageType}
                    selection='single'
                    presentation='icon'
                    classes={{ root: 'flex-col' }}
                />
            </nav>

            <div class='flex min-w-0 flex-1 flex-col'>
                <div class='flex h-12 shrink-0 items-center gap-3 border-b border-line-subtle bg-surface px-2'>
                    <div class='flex w-[234px] shrink-0'>
                        <Text
                            label={t('common.search')}
                            value={keyword()}
                            placeholder={t('task.searchPlaceholder')}
                            icon={(
                                <Search
                                    size={14}
                                    strokeWidth={1.7}
                                />
                            )}
                            classes={{ root: 'min-w-0 flex-1', label: 'hidden' }}
                            onInput={setKeyword}
                        />
                    </div>
                    <Show
                        when={props.mode === 'single' && selectedSingle()}
                        fallback={(
                            <Show when={props.mode === 'multiple' && selectedMultiple().length > 0}>
                                <SelectedCountChip
                                    count={selectedMultiple().length}
                                    onClear={clearSelection}
                                />
                            </Show>
                        )}
                    >
                        {item => (
                            <span class='flex h-7 min-w-0 items-center gap-2 rounded-md bg-selected px-1 text-xs leading-none text-fg'>
                                <img
                                    class='size-5 shrink-0 rounded object-cover'
                                    src={resolveImageUrl(item().image.url)}
                                    alt=''
                                />
                                <span
                                    class='truncate font-medium'
                                    classList={{ 'font-mono': !item().matchedUsage.taskName }}
                                >
                                    {imageLabel(item())}
                                </span>
                                <span class='shrink-0 text-fg-muted tabular-nums'>
                                    {item().image.width} × {item().image.height}
                                </span>
                                <ClearSelectionButton onClick={clearSelection} />
                            </span>
                        )}
                    </Show>
                    <div class='ml-auto'>
                        <ThumbnailSizeSlider grid={thumbnailGrid} />
                    </div>
                </div>

                <div
                    ref={element => {
                        loadOnScroll.setViewport(element)
                        thumbnailGrid.observe(element)
                    }}
                    class='scrollbar-thin relative min-h-0 flex-1 overflow-y-auto [scrollbar-gutter:stable]'
                >
                    <Loading.Swap
                        loading={() => props.open && query.isLoading}
                        fallback={(
                            <div
                                class='grid content-start gap-3 p-2'
                                style={gridStyle()}
                            >
                                <For each={imageSkeletonCells}>
                                    {() => <ImageCardSkeleton />}
                                </For>
                            </div>
                        )}
                    >
                        <Show when={hasLoadError()}>
                            <div class='flex min-h-full items-center justify-center px-4'>
                                <StatusMessage
                                    kind='load-error'
                                    message={t('image.loadFailed')}
                                    onRetry={() => void query.refetch()}
                                />
                            </div>
                        </Show>

                        <Show when={!hasLoadError()}>
                            <Show
                                when={items().length > 0}
                                fallback={(
                                    <div class='flex min-h-full items-center justify-center px-4'>
                                        <StatusMessage
                                            kind='empty'
                                            title={t('image.emptyTitle')}
                                            message={t('image.emptyMessage')}
                                            icon={(
                                                <Images
                                                    size={21}
                                                    strokeWidth={1.5}
                                                />
                                            )}
                                        />
                                    </div>
                                )}
                            >
                                <div
                                    class='grid content-start gap-3 p-2'
                                    style={gridStyle()}
                                >
                                    <For each={items()}>
                                        {item => {
                                            const disabled = () => isDisabled(item)
                                            const selected = () => isSelected(item)

                                            return (
                                                <Button
                                                    variant='ghost'
                                                    disabled={disabled()}
                                                    classes={{
                                                        root: cn(
                                                            'group block w-full min-w-0 rounded-lg border border-transparent p-2 text-left hover:bg-hover',
                                                            selected() && 'border-accent bg-accent/20 ring-2 ring-accent/40 hover:bg-accent/20',
                                                            disabled() && 'hover:bg-transparent',
                                                        ),
                                                    }}
                                                    onClick={() => toggle(item)}
                                                >
                                                    <div class='relative aspect-square overflow-hidden rounded-md border border-line-subtle bg-active'>
                                                        <img
                                                            class='absolute inset-0 size-full object-cover'
                                                            src={resolveImageUrl(item.image.url)}
                                                            alt=''
                                                            loading='lazy'
                                                        />
                                                        <Show when={item.matchedUsage.flag}>
                                                            {flag => (
                                                                <TaskFlagOverlay
                                                                    pin={flag() === 'pin'}
                                                                    discard={flag() === 'discard'}
                                                                    dim={!disabled()}
                                                                    carrier='card'
                                                                />
                                                            )}
                                                        </Show>
                                                        <Show when={!disabled()}>
                                                            <span
                                                                class={cn(
                                                                    'absolute right-1 top-1 grid size-7 place-items-center rounded-md',
                                                                    selected()
                                                                        ? 'bg-accent text-[10px] font-bold text-on-stage'
                                                                        : 'bg-stage-control text-on-stage/75 opacity-0 backdrop-blur-[3px] group-hover:opacity-100 group-focus-within:opacity-100',
                                                                )}
                                                            >
                                                                <Show
                                                                    when={props.mode === 'multiple' && selected()}
                                                                    fallback={(
                                                                        <Check
                                                                            size={14}
                                                                            strokeWidth={2}
                                                                        />
                                                                    )}
                                                                >
                                                                    {selectionNumber(item)}
                                                                </Show>
                                                            </span>
                                                        </Show>
                                                        <Show when={disabled()}>
                                                            <span class='absolute inset-0 grid place-items-center bg-stage-overlay-muted'>
                                                                <Check
                                                                    size={22}
                                                                    strokeWidth={2.5}
                                                                    class='text-stage-overlay-text'
                                                                />
                                                            </span>
                                                        </Show>
                                                    </div>

                                                    <div class='mt-2 flex h-7 min-w-0 items-center gap-1.5'>
                                                        <span
                                                            class='min-w-0 flex-1 truncate text-xs font-medium text-fg'
                                                            classList={{ 'font-mono': !item.matchedUsage.taskName }}
                                                        >
                                                            {imageLabel(item)}
                                                        </span>
                                                        <ImageTypeBadge type={item.matchedUsage.type} />
                                                    </div>
                                                </Button>
                                            )
                                        }}
                                    </For>
                                    <Show when={query.isFetchingNextPage}>
                                        <For each={nextPageSkeletonCells}>
                                            {() => <ImageCardSkeleton />}
                                        </For>
                                    </Show>
                                </div>

                                <Show when={query.isError}>
                                    <StatusMessage
                                        kind='load-error'
                                        size='compact'
                                        message={t('image.loadMoreFailed')}
                                        onRetry={() => void query.fetchNextPage()}
                                    />
                                </Show>
                                <Show when={query.hasNextPage && !query.isError}>
                                    <div
                                        ref={loadOnScroll.setTrigger}
                                        class='h-px'
                                    />
                                </Show>
                            </Show>
                        </Show>
                    </Loading.Swap>
                </div>
            </div>
        </Dialog>
    )
}

function imageLabel(item: ImageApi.ImageListItem) {
    return originLabel(item.matchedUsage) ?? item.image.id.slice(0, 8)
}

function ClearSelectionButton(props: { onClick: () => void }) {
    return (
        <Button
            variant='ghost'
            title={t('task.clearSelection')}
            classes={{ root: 'size-5 shrink-0 rounded p-0 text-fg-muted hover:text-fg' }}
            onClick={props.onClick}
        >
            <X
                size={13}
                strokeWidth={1.9}
            />
        </Button>
    )
}

/* 與卡片同框：p-2、方形縮圖、mt-2 一列 28px（名稱條＋小標條） */
function ImageCardSkeleton() {
    return (
        <div class='min-w-0 rounded-lg border border-transparent p-2'>
            <Loading.Skeleton class='aspect-square w-full rounded-md' />
            <div class='mt-2 flex h-7 min-w-0 items-center justify-between gap-1.5'>
                <Loading.Skeleton class='h-3 w-3/4' />
                <Loading.Skeleton class='h-4 w-7 rounded' />
            </div>
        </div>
    )
}
