import { ImagePlus, RotateCcw, Search, X } from 'lucide-solid'
import { createEffect, createSignal, on, onCleanup, Show } from 'solid-js'

import { Button } from '#/components/base/Button'
import { FieldHint } from '#/components/base/FieldHint'
import { DetailSection } from '#/components/detail'
import { FileDrop, Number, Slider } from '#/components/field'
import { ImagePickerDialog } from '#/pages/generate/components/ImagePickerDialog'
import { ImageViewer } from '#/pages/generate/components/workspace/shared/ImageViewer'
import { referencePreviewUrl, toViewerImage } from '#/pages/generate/form'
import { originLabel } from '#/pages/generate/label'
import { useGenerateStore } from '#/pages/generate/store'

import type { FileUploadFileRejection } from '@ark-ui/solid'
import type { TaskDetailMode } from '#/pages/generate/components/config/TaskDetailMode'
import type { GenerateTask, ReferenceImage } from '#/pages/generate/form'

type TaskImageProps = {
    mode: TaskDetailMode
    task: GenerateTask
}

const acceptedMimes = ['image/png', 'image/jpeg']

export function TaskImage(props: TaskImageProps) {
    const store = useGenerateStore()
    const form = store.form
    const [pickerOpen, setPickerOpen] = createSignal(false)
    const [error, setError] = createSignal<string>()
    const isView = () => props.mode === 'view'
    let probeToken = 0
    let pendingPreviewUrl: string | undefined

    const revokePendingPreview = (previewUrl: string) => {
        if (pendingPreviewUrl !== previewUrl) {
            return
        }

        pendingPreviewUrl = undefined
        URL.revokeObjectURL(previewUrl)
    }

    const releasePendingProbe = () => {
        probeToken += 1
        const previewUrl = pendingPreviewUrl

        if (previewUrl) {
            revokePendingPreview(previewUrl)
        }
    }

    /* 換 task 時撤銷尚未完成的 probe，避免舊圖片完成後寫入新 task。 */
    createEffect(on(() => props.task.id, () => {
        releasePendingProbe()
        setError()
    }))

    onCleanup(() => {
        releasePendingProbe()
    })

    const acceptFile = (file: File) => {
        releasePendingProbe()
        setError()

        const previewUrl = URL.createObjectURL(file)
        const currentTaskId = props.task.id
        const currentProbeToken = probeToken
        pendingPreviewUrl = previewUrl
        const probe = new Image()

        probe.addEventListener('load', () => {
            if (currentProbeToken !== probeToken || currentTaskId !== props.task.id) {
                revokePendingPreview(previewUrl)
                return
            }

            pendingPreviewUrl = undefined
            store.setReferenceImage({
                type: 'local',
                file,
                previewUrl,
                width: probe.naturalWidth,
                height: probe.naturalHeight,
                sizeBytes: file.size,
            })
        })
        probe.addEventListener('error', () => {
            if (currentProbeToken !== probeToken || currentTaskId !== props.task.id) {
                revokePendingPreview(previewUrl)
                return
            }

            revokePendingPreview(previewUrl)
            setError('That file could not be read as an image.')
        })
        probe.src = previewUrl
    }

    const rejectFile = (rejection: FileUploadFileRejection) => {
        setError(rejection.errors.includes('FILE_INVALID_TYPE')
            ? 'Use a PNG or JPEG image.'
            : 'That file cannot be used as a reference image.')
    }

    const clearReference = () => {
        releasePendingProbe()
        store.clearReferenceImage()
    }

    return (
        <DetailSection title='Image'>
            <form.Field name='referenceImage'>
                {referenceField => {
                    const reference = () => referenceField().state.value

                    return (
                        <>
                            <Show
                                when={reference()}
                                fallback={(
                                    <>
                                        <FileDrop
                                            accept={acceptedMimes}
                                            disabled={isView()}
                                            onAccept={acceptFile}
                                            onReject={rejectFile}
                                        >
                                            <ImagePlus
                                                size={20}
                                                strokeWidth={1.5}
                                                aria-hidden='true'
                                            />
                                            <span class='text-xs text-fg-secondary'>Drop an image or click to browse</span>
                                            <span class='text-[11px]'>PNG · JPEG</span>
                                        </FileDrop>
                                        <Button
                                            disabled={isView()}
                                            classes={{ root: 'w-full border border-dashed border-line bg-transparent' }}
                                            onClick={() => setPickerOpen(true)}
                                        >
                                            <Search
                                                size={13}
                                                strokeWidth={1.8}
                                                aria-hidden='true'
                                            />
                                            Search image library
                                        </Button>
                                    </>
                                )}
                            >
                                {value => (
                                    <ReferenceSlot
                                        mode={props.mode}
                                        reference={value()}
                                        onRemove={clearReference}
                                    />
                                )}
                            </Show>

                            <Show when={reference()}>
                                <div class='flex flex-col gap-1'>
                                    <span class='text-xs leading-none text-fg-muted'>Denoise</span>
                                    <form.Field name='denoise'>
                                        {denoiseField => (
                                            <div class='flex items-center gap-2.5'>
                                                <Slider
                                                    label='Denoise'
                                                    min={0.05}
                                                    max={1}
                                                    step={0.05}
                                                    value={denoiseField().state.value}
                                                    disabled={isView()}
                                                    onChange={denoiseField().handleChange}
                                                    classes={{ root: 'flex-1' }}
                                                />
                                                <Number
                                                    label='Denoise'
                                                    min={0.05}
                                                    max={1}
                                                    step={0.05}
                                                    value={denoiseField().state.value}
                                                    disabled={isView()}
                                                    onChange={denoiseField().handleChange}
                                                    classes={{
                                                        root: 'w-16 flex-none',
                                                        label: 'sr-only',
                                                        input: 'h-6 px-2 text-center',
                                                    }}
                                                />
                                            </div>
                                        )}
                                    </form.Field>
                                </div>
                            </Show>
                        </>
                    )
                }}
            </form.Field>

            <Show when={error()}>
                {message => <FieldHint tone='danger'>{message()}</FieldHint>}
            </Show>

            <ImagePickerDialog
                mode='single'
                open={pickerOpen()}
                onOpenChange={setPickerOpen}
                onSelect={reference => {
                    releasePendingProbe()
                    setError()
                    store.setReferenceImage(reference)
                }}
            />
        </DetailSection>
    )
}

type ReferenceSlotProps = {
    mode: TaskDetailMode
    reference: ReferenceImage
    onRemove: () => void
}

function ReferenceSlot(props: ReferenceSlotProps) {
    const origin = () => (props.reference.type === 'asset' ? props.reference.origin : null)
    const [expanded, setExpanded] = createSignal(false)
    const isView = () => props.mode === 'view'

    return (
        <>
            <div class='relative h-40 overflow-hidden rounded-md bg-active'>
                <img
                    class='absolute inset-0 size-full object-contain'
                    src={referencePreviewUrl(props.reference)}
                    alt='Reference image'
                    role='button'
                    tabIndex={0}
                    onClick={() => setExpanded(true)}
                />
                <Button
                    disabled={isView()}
                    variant='ghost'
                    aria-label='Remove reference image'
                    classes={{ root: 'absolute right-1.5 top-1.5 size-6 rounded-md border-0 bg-black/60 p-0 text-fg-secondary backdrop-blur-[3px] hover:bg-danger/35 hover:text-white' }}
                    onClick={props.onRemove}
                >
                    <X
                        size={13}
                        strokeWidth={2}
                        aria-hidden='true'
                    />
                </Button>
            </div>

            <Show when={origin()}>
                {usage => (
                    <Button
                        disabled={isView()}
                        classes={{ root: 'w-full border border-line bg-transparent' }}
                    >
                        <RotateCcw
                            size={13}
                            strokeWidth={1.7}
                            aria-hidden='true'
                        />
                        {originLabel(usage())}
                    </Button>
                )}
            </Show>

            <Show when={expanded()}>
                <ImageViewer
                    images={[toViewerImage(props.reference)]}
                    selectedIndex={0}
                    actions={null}
                    onClose={() => setExpanded(false)}
                    onSelect={() => undefined}
                />
            </Show>
        </>
    )
}
