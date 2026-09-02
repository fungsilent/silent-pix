import { ImagePlus, RotateCcw, Search, X } from 'lucide-solid'
import { createSignal, Show } from 'solid-js'

import { Button } from '#/components/base/Button'
import { FieldHint } from '#/components/base/FieldHint'
import { Loading } from '#/components/base/Loading'
import { DetailSection } from '#/components/detail'
import { FileDrop, Number, Slider } from '#/components/field'
import { ImagePickerDialog } from '#/components/image/ImagePickerDialog'
import { ImageViewer } from '#/components/viewer/ImageViewer'
import { originLabel } from '#/features/image/image.label'

import type { FileUploadFileRejection } from '@ark-ui/solid'
import type { ImageApi } from '@silent-pix/shared'
import type { Accessor } from 'solid-js'

export type TaskImageReference = {
    url: string
    width: number
    height: number
    origin: ImageApi.ImageUsage | null
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
    onReferenceReject: (message: string) => void
    onReferenceAsset: (item: ImageApi.ImageListItem) => void
    onRemoveReference: () => void
    onDenoiseChange: (value: number) => void
    setImagePickerOpen: (open: boolean) => void
}

export type TaskImageProps = {
    mode: 'create'
    data: TaskImageCreateData
    actions: TaskImageActions
    loading: Accessor<boolean>
} | {
    mode: 'view'
    data: TaskImageData
    loading: Accessor<boolean>
}

const acceptedMimes = ['image/png', 'image/jpeg']

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
            props.actions.onReferenceReject(rejection.errors.includes('FILE_INVALID_TYPE')
                ? 'Use a PNG or JPEG image.'
                : 'That file cannot be used as a reference image.')
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
            title='Image'
            inert={props.loading()}
        >
            <Show
                when={reference()}
                fallback={(
                    isCreate() ? (
                        <>
                            <Loading.Mask loading={props.loading}>
                                <FileDrop
                                    accept={acceptedMimes}
                                    onAccept={onReferenceFile}
                                    onReject={onReferenceReject}
                                >
                                    <ImagePlus
                                        size={20}
                                        strokeWidth={1.5}
                                        aria-hidden='true'
                                    />
                                    <span class='text-xs text-fg-secondary'>Drop an image or click to browse</span>
                                    <span class='text-[11px]'>PNG · JPEG</span>
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
                                        aria-hidden='true'
                                    />
                                    Search image library
                                </Button>
                            </Loading.Mask>
                        </>
                    ) : (
                        <Loading.Mask loading={props.loading}>
                            <div class='flex flex-col items-center gap-2 rounded-md border border-dashed border-line bg-active px-3 py-6 text-center text-fg-muted'>
                                <ImagePlus
                                    size={20}
                                    strokeWidth={1.5}
                                    aria-hidden='true'
                                />
                                <span class='text-xs'>No reference image.</span>
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
                <div class='flex flex-col gap-1'>
                    <span class='text-xs leading-none text-fg-muted'>Denoise</span>
                    <Loading.Mask loading={props.loading}>
                        <div class='flex items-center gap-2.5'>
                            <Slider
                                label='Denoise'
                                min={0.05}
                                max={1}
                                step={0.05}
                                value={props.data.denoise()}
                                disabled={!isCreate()}
                                onChange={onDenoiseChange}
                                classes={{ root: 'flex-1' }}
                            />
                            <Number
                                label='Denoise'
                                min={0.05}
                                max={1}
                                step={0.05}
                                value={props.data.denoise()}
                                disabled={!isCreate()}
                                onChange={onDenoiseChange}
                                classes={{
                                    root: 'w-16 flex-none',
                                    label: 'sr-only',
                                    input: 'h-6 px-2 text-center',
                                }}
                            />
                        </div>
                    </Loading.Mask>
                </div>
            </Show>

            <Show when={referenceError()}>
                {message => <FieldHint tone='danger'>{message()}</FieldHint>}
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
} | {
    mode: 'view'
    loading: boolean
    reference: TaskImageReference
}

function ReferenceSlot(props: ReferenceSlotProps) {
    const [expanded, setExpanded] = createSignal(false)
    const onRemove = () => {
        if (props.mode === 'create') {
            props.onRemove()
        }
    }

    return (
        <>
            <div class='relative h-40 overflow-hidden rounded-md bg-active'>
                <img
                    class='absolute inset-0 size-full object-contain'
                    src={props.reference.url}
                    alt='Reference image'
                    role='button'
                    tabIndex={0}
                    onClick={() => setExpanded(true)}
                />
                <Show when={props.mode === 'create'}>
                    <Button
                        variant='ghost'
                        aria-label='Remove reference image'
                        classes={{ root: 'absolute right-1.5 top-1.5 size-6 rounded-md border-0 bg-black/60 p-0 text-fg-secondary backdrop-blur-[3px] hover:bg-danger/35 hover:text-white' }}
                        onClick={onRemove}
                    >
                        <X
                            size={13}
                            strokeWidth={2}
                            aria-hidden='true'
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
                                <span class='block truncate text-xs text-fg-secondary'>
                                    {originLabel(origin())}
                                </span>
                            )}
                        >
                            <Button classes={{ root: 'w-full border border-line bg-transparent' }}>
                                <RotateCcw
                                    size={13}
                                    strokeWidth={1.7}
                                    aria-hidden='true'
                                />
                                {originLabel(origin())}
                            </Button>
                        </Show>
                    </Loading.Mask>
                )}
            </Show>

            <Show when={expanded()}>
                <ImageViewer
                    images={[{
                        url: props.reference.url,
                        width: props.reference.width,
                        height: props.reference.height,
                    }]}
                    selectedIndex={0}
                    actions={null}
                    onClose={() => setExpanded(false)}
                    onSelect={() => undefined}
                />
            </Show>
        </>
    )
}
