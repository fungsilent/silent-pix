import { Expand, ImagePlus, RotateCcw, Search, X } from 'lucide-solid'
import { createEffect, createSignal, on, Show } from 'solid-js'

import { Button } from '#/components/base/Button'
import { SectionTitle } from '#/components/base/SectionTitle'
import { FileDrop, Number, Slider } from '#/components/field'
import { TaskImageDialog } from '#/pages/generate/components/config/TaskImageDialog'
import { ImageViewer } from '#/pages/generate/components/workspace/shared/ImageViewer'
import { referencePreviewUrl, toViewerImage, useGenerateStore } from '#/pages/generate/store'

import type { FileUploadFileRejection } from '@ark-ui/solid'
import type { GenerateTask, ReferenceImage } from '#/pages/generate/store'

type TaskImageProps = {
    task: GenerateTask
}

const acceptedMimes = ['image/png', 'image/jpeg']

export function TaskImage(props: TaskImageProps) {
    const store = useGenerateStore()
    const [pickerOpen, setPickerOpen] = createSignal(false)
    const [error, setError] = createSignal<string>()

    const reference = () => store.state.values.referenceImage

    /* 換 task 時清掉上一張圖留下的錯誤，跟 TaskInfo 的 rename error 同一個做法 */
    createEffect(on(() => props.task.id, () => setError()))

    const acceptFile = (file: File) => {
        setError()

        const previewUrl = URL.createObjectURL(file)
        const probe = new Image()

        probe.addEventListener('load', () => {
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
            URL.revokeObjectURL(previewUrl)
            setError('That file could not be read as an image.')
        })
        probe.src = previewUrl
    }

    const rejectFile = (rejection: FileUploadFileRejection) => {
        setError(rejection.errors.includes('FILE_INVALID_TYPE')
            ? 'Use a PNG or JPEG image.'
            : 'That file cannot be used as a reference image.')
    }

    return (
        <section class='flex flex-col gap-2'>
            <div class='flex flex-col gap-1 py-1'>
                <SectionTitle>Image</SectionTitle>
            </div>

            <Show
                when={reference()}
                fallback={(
                    <>
                        <FileDrop
                            accept={acceptedMimes}
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
                        reference={value()}
                        onRemove={store.clearReferenceImage}
                    />
                )}
            </Show>

            <Show when={error()}>
                {message => <p class='m-0 text-xs text-danger-fg'>{message()}</p>}
            </Show>

            <Show when={reference()}>
                <div class='flex flex-col gap-1'>
                    <span class='text-xs leading-none text-fg-muted'>Denoise</span>
                    <div class='flex items-center gap-2.5'>
                        <Slider
                            label='Denoise'
                            min={0.05}
                            max={1}
                            step={0.05}
                            value={store.state.values.denoise}
                            onChange={value => store.setValue('denoise', value)}
                            classes={{ root: 'flex-1' }}
                        />
                        <Number
                            label='Denoise'
                            min={0.05}
                            max={1}
                            step={0.05}
                            value={store.state.values.denoise}
                            onChange={value => store.setValue('denoise', value)}
                            classes={{
                                root: 'w-16 flex-none',
                                label: 'sr-only',
                                input: 'h-6 px-2 text-center',
                            }}
                        />
                    </div>
                </div>
            </Show>

            <TaskImageDialog
                open={pickerOpen()}
                onOpenChange={setPickerOpen}
                onSelect={reference => {
                    setError()
                    store.setReferenceImage(reference)
                }}
            />
        </section>
    )
}

type ReferenceSlotProps = {
    reference: ReferenceImage
    onRemove: () => void
}

function ReferenceSlot(props: ReferenceSlotProps) {
    const origin = () => (props.reference.type === 'asset' ? props.reference.origin : null)
    const [expanded, setExpanded] = createSignal(false)

    return (
        <>
            <div class='relative h-40 overflow-hidden rounded-md bg-active'>
                <img
                    class='absolute inset-0 size-full object-contain'
                    src={referencePreviewUrl(props.reference)}
                    alt='Reference image'
                />
                <Button
                    variant='ghost'
                    aria-label='Expand reference image'
                    classes={{ root: 'absolute right-9 top-1.5 size-6 rounded-md border-0 bg-black/60 p-0 text-fg-secondary backdrop-blur-[3px] hover:bg-active hover:text-white' }}
                    onClick={() => setExpanded(true)}
                >
                    <Expand
                        size={13}
                        strokeWidth={1.8}
                        aria-hidden='true'
                    />
                </Button>
                <Button
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
                    <Button classes={{ root: 'w-full border border-line bg-transparent' }}>
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

/* 顯示規則跟左側 TaskItem 一致：有名字用名字，沒有就用短 id */
function originLabel(usage: { taskId: string, taskName: string | null, sortIndex: number }): string {
    const name = usage.taskName ?? usage.taskId.slice(0, 8)

    return `${name} #${usage.sortIndex + 1}`
}
