import { image } from '@silent-pix/shared'
import { ArrowUpRight, Brush, Eye, ImagePlus, Search, Trash2, TriangleAlert, X } from 'lucide-solid'
import { createEffect, createMemo, createSignal, on, Show } from 'solid-js'

import { resolveImageUrl } from '#/api/image'
import { Button } from '#/components/base/Button'
import { Loading } from '#/components/base/Loading'
import { DetailSection } from '#/components/detail'
import { FileDrop, Number, Slider } from '#/components/field'
import { ImagePickerDialog } from '#/components/image/ImagePickerDialog'
import { ImageTypeBadge } from '#/components/image/ImageTypeBadge'
import { ImageViewer } from '#/components/viewer/ImageViewer'
import { originTaskLabel } from '#/features/image/image.label'
import { cn } from '#/lib/cn'
import { t } from '#/lib/i18n'

import type { FileUploadFileRejection } from '@ark-ui/solid'
import type { ImageApi } from '@silent-pix/shared'
import type { Accessor } from 'solid-js'

export type TaskImageReference = {
    url: string
    width: number
    height: number
    origin: ImageApi.ImageUsage | null
    maskUrl: string | null
}

export type TaskImageData = {
    reference: Accessor<TaskImageReference | null>
    denoise: Accessor<number>
}

export type TaskImageCreateData = TaskImageData & {
    imagePickerOpen: Accessor<boolean>
    referenceError: Accessor<string | undefined>
}

export type TaskImageActions = {
    onReferenceFile: (file: File) => void
    onReferenceReject: (message: () => string) => void
    onReferenceAsset: (item: ImageApi.ImageListItem) => void
    onRemoveReference: () => void
    onEditMask: () => void
    onClearMask: () => void
    onSelectOrigin: (taskId: string) => void
    onDenoiseChange: (value: number) => void
    setImagePickerOpen: (open: boolean) => void
}

type TaskImageProps = {
    mode: 'create'
    data: TaskImageCreateData
    actions: TaskImageActions
    loading: Accessor<boolean>
} | {
    mode: 'view'
    data: TaskImageData
    loading: Accessor<boolean>
}

export function TaskImage(props: TaskImageProps) {
    const reference = () => props.data.reference()
    const isCreate = () => props.mode === 'create'
    const referenceError = () => props.mode === 'create' ? props.data.referenceError() : undefined
    const imagePickerOpen = () => props.mode === 'create' ? props.data.imagePickerOpen() : false

    const onReferenceFile = (file: File) => {
        if (props.mode === 'create') {
            props.actions.onReferenceFile(file)
        }
    }

    const onReferenceReject = (rejection: FileUploadFileRejection) => {
        if (props.mode === 'create') {
            props.actions.onReferenceReject(() => rejection.errors.includes('FILE_INVALID_TYPE')
                ? t('image.invalidType')
                : t('image.invalidReference'))
        }
    }

    const onImagePickerOpenChange = (open: boolean) => {
        if (props.mode === 'create') {
            props.actions.setImagePickerOpen(open)
        }
    }

    const onReferenceAsset = (item: ImageApi.ImageListItem) => {
        if (props.mode === 'create') {
            props.actions.onReferenceAsset(item)
        }
    }

    const onRemoveReference = () => {
        if (props.mode === 'create') {
            props.actions.onRemoveReference()
        }
    }

    const onDenoiseChange = (value: number) => {
        if (props.mode === 'create') {
            props.actions.onDenoiseChange(value)
        }
    }

    return (
        <DetailSection
            title={t('image.title')}
            inert={props.loading()}
        >
            <Show
                when={reference()}
                fallback={(
                    isCreate() ? (
                        <>
                            <Loading.Mask loading={props.loading}>
                                <FileDrop
                                    accept={[...image.imageMimeValues]}
                                    onAccept={onReferenceFile}
                                    onReject={onReferenceReject}
                                    invalid={!!referenceError()}
                                >
                                    <ImagePlus
                                        size={20}
                                        strokeWidth={1.5}
                                    />
                                    <span class='text-xs text-fg-secondary'>{t('image.dropHint')}</span>
                                    <Show
                                        when={referenceError()}
                                        fallback={<span class='text-[11px]'>PNG · JPEG</span>}
                                    >
                                        {message => (
                                            <span class='flex items-center gap-1 text-[11px] text-fg'>
                                                <TriangleAlert
                                                    size={11}
                                                    strokeWidth={2}
                                                    class='shrink-0 text-danger-fg'
                                                />
                                                {message()}
                                            </span>
                                        )}
                                    </Show>
                                </FileDrop>
                            </Loading.Mask>
                            <Loading.Mask loading={props.loading}>
                                <Button
                                    classes={{ root: 'w-full border border-dashed border-line bg-transparent' }}
                                    onClick={() => onImagePickerOpenChange(true)}
                                >
                                    <Search
                                        size={13}
                                        strokeWidth={1.8}
                                    />
                                    {t('image.searchLibrary')}
                                </Button>
                            </Loading.Mask>
                        </>
                    ) : (
                        <Loading.Mask loading={props.loading}>
                            <div class='flex flex-col items-center gap-2 rounded-md border border-dashed border-line bg-active px-3 py-6 text-center text-fg-muted'>
                                <ImagePlus
                                    size={20}
                                    strokeWidth={1.5}
                                />
                                <span class='text-xs'>{t('image.noReference')}</span>
                            </div>
                        </Loading.Mask>
                    )
                )}
            >
                {value => props.mode === 'create'
                    ? (
                        <ReferenceSlot
                            mode='create'
                            loading={props.loading()}
                            reference={value()}
                            onRemove={onRemoveReference}
                            onEditMask={props.actions.onEditMask}
                            onClearMask={props.actions.onClearMask}
                            onSelectOrigin={taskId => {
                                if (props.mode === 'create') {
                                    props.actions.onSelectOrigin(taskId)
                                }
                            }}
                        />
                    )
                    : (
                        <ReferenceSlot
                            mode='view'
                            loading={props.loading()}
                            reference={value()}
                        />
                    )}
            </Show>

            <Show when={reference()}>
                <div class='flex flex-col gap-1.5'>
                    <span class='text-xs leading-none text-fg-muted'>{t('fields.denoise')}</span>
                    <Loading.Mask loading={props.loading}>
                        <div class='flex items-center gap-2.5'>
                            <Slider
                                label={t('fields.denoise')}
                                min={0.05}
                                max={1}
                                step={0.05}
                                value={props.data.denoise()}
                                disabled={!isCreate()}
                                onChange={onDenoiseChange}
                                classes={{ root: 'flex-1' }}
                            />
                            <Number
                                label={t('fields.denoise')}
                                min={0.05}
                                max={1}
                                step={0.05}
                                value={props.data.denoise()}
                                disabled={!isCreate()}
                                onChange={onDenoiseChange}
                                classes={{
                                    root: 'w-16 flex-none',
                                    label: 'hidden',
                                    input: 'h-6 px-2 text-center',
                                }}
                            />
                        </div>
                    </Loading.Mask>
                </div>
            </Show>

            <Show when={isCreate()}>
                <ImagePickerDialog
                    mode='single'
                    open={imagePickerOpen()}
                    onOpenChange={onImagePickerOpenChange}
                    onSelect={onReferenceAsset}
                />
            </Show>
        </DetailSection>
    )
}

type ReferenceSlotProps = {
    mode: 'create'
    loading: boolean
    reference: TaskImageReference
    onRemove: () => void
    onEditMask: () => void
    onClearMask: () => void
    onSelectOrigin: (taskId: string) => void
} | {
    mode: 'view'
    loading: boolean
    reference: TaskImageReference
}

function ReferenceSlot(props: ReferenceSlotProps) {
    const [expanded, setExpanded] = createSignal(false)
    const [maskOnly, setMaskOnly] = createSignal(false)
    const referenceUrl = createMemo(() => props.reference.url)
    const maskUrl = createMemo(() => props.reference.maskUrl)
    const displayedMask = () => maskOnly() ? maskUrl() : null
    const imageUrl = () => displayedMask() ?? referenceUrl()

    createEffect(on([referenceUrl, maskUrl], () => setMaskOnly(false)))

    const onRemove = () => {
        if (props.mode === 'create') {
            props.onRemove()
        }
    }

    return (
        <>
            <div class={cn('relative h-40 overflow-hidden rounded-md', displayedMask() ? 'bg-black' : 'bg-active')}>
                <img
                    class='absolute inset-0 size-full object-contain'
                    src={resolveImageUrl(imageUrl())}
                    alt={displayedMask() ? t('image.mask.badge') : t('fields.referenceImage')}
                    onClick={() => setExpanded(true)}
                />
                <Show when={maskUrl()}>
                    {url => (
                        <>
                            <Show when={!maskOnly()}>
                                <div
                                    class='pointer-events-none absolute inset-0 bg-accent/50 mask-contain mask-center mask-no-repeat mask-luminance'
                                    style={{ 'mask-image': `url("${resolveImageUrl(url())}")` }}
                                />
                            </Show>
                            <Button
                                variant='ghost'
                                title={maskOnly() ? t('image.mask.showOverlay') : t('image.mask.showMask')}
                                classes={{
                                    root: cn(
                                        'absolute left-1.5 top-1.5 h-6 gap-1.5 px-2 py-0 text-[11px] font-semibold leading-none tracking-wide',
                                        maskOnly()
                                            ? 'bg-accent text-accent-fg hover:bg-accent-hover'
                                            : 'border-stage-line bg-stage-control text-on-stage backdrop-blur-[3px] hover:bg-stage-control-hover',
                                    ),
                                }}
                                onClick={() => setMaskOnly(current => !current)}
                            >
                                <Eye
                                    size={13}
                                    strokeWidth={1.8}
                                    class='shrink-0'
                                />
                                {t('image.mask.badge')}
                            </Button>
                        </>
                    )}
                </Show>
                <Show when={props.mode === 'create'}>
                    <Button
                        variant='ghost'
                        classes={{ root: 'absolute right-1.5 top-1.5 size-6 rounded-md border-0 bg-stage-control p-0 text-on-stage backdrop-blur-[3px] hover:bg-danger/35 hover:text-on-stage' }}
                        onClick={onRemove}
                    >
                        <X
                            size={13}
                            strokeWidth={2}
                        />
                    </Button>
                </Show>
                <Show when={props.loading}>
                    <Loading.Skeleton class='absolute inset-0 z-10' />
                </Show>
            </div>

            <Show when={props.reference.origin}>
                {origin => (
                    <Loading.Mask loading={() => props.loading}>
                        <Show
                            when={props.mode === 'create'}
                            fallback={(
                                <span class='flex min-w-0 items-center gap-2 text-xs text-fg-secondary'>
                                    <OriginText origin={origin()} />
                                </span>
                            )}
                        >
                            <Button
                                classes={{ root: 'w-full justify-start border border-line bg-transparent' }}
                                onClick={() => {
                                    if (props.mode === 'create') {
                                        props.onSelectOrigin(origin().taskId)
                                    }
                                }}
                            >
                                <OriginText origin={origin()} />
                                <ArrowUpRight
                                    class='ml-auto shrink-0'
                                    size={13}
                                    strokeWidth={1.8}
                                />
                            </Button>
                        </Show>
                    </Loading.Mask>
                )}
            </Show>

            <Show when={props.mode === 'create' ? props : undefined}>
                {editable => (
                    <Loading.Mask loading={() => props.loading}>
                        <div class='flex min-w-0 gap-2'>
                            <Button
                                classes={{ root: 'min-w-0 flex-1 border border-line bg-transparent' }}
                                onClick={() => editable().onEditMask()}
                            >
                                <Brush
                                    size={13}
                                    strokeWidth={1.8}
                                />
                                {props.reference.maskUrl ? t('image.mask.edit') : t('image.mask.paint')}
                            </Button>
                            <Show when={props.reference.maskUrl}>
                                <Button
                                    variant='ghost'
                                    title={t('image.mask.clear')}
                                    classes={{ root: 'size-7 flex-none border border-line bg-transparent p-0 text-fg-secondary hover:border-danger/50 hover:bg-danger/15 hover:text-danger-fg' }}
                                    onClick={() => editable().onClearMask()}
                                >
                                    <Trash2
                                        size={13}
                                        strokeWidth={1.8}
                                    />
                                </Button>
                            </Show>
                        </div>
                    </Loading.Mask>
                )}
            </Show>

            <Show when={expanded()}>
                <ImageViewer
                    images={[{
                        url: imageUrl(),
                        width: props.reference.width,
                        height: props.reference.height,
                    }]}
                    selectedIndex={0}
                    onClose={() => setExpanded(false)}
                    onSelect={() => undefined}
                />
            </Show>
        </>
    )
}

function OriginText(props: { origin: ImageApi.ImageUsage }) {
    return (
        <>
            <span
                class='min-w-0 truncate'
                classList={{ 'font-mono': !props.origin.taskName }}
            >
                {originTaskLabel(props.origin)}
            </span>
            <ImageTypeBadge type={props.origin.type} />
        </>
    )
}
