import { FileUpload } from '@ark-ui/solid'

import { cn } from '#/lib/cn'

import type { FileUploadFileRejection } from '@ark-ui/solid'
import type { JSX } from 'solid-js'

type FileDropProps = {
    accept: string[]
    children: JSX.Element
    disabled?: boolean
    maxFileSize?: number | undefined
    onAccept: (file: File) => void
    onReject: (rejection: FileUploadFileRejection) => void
    classes?: {
        root?: string
        dropzone?: string
    }
}

export function FileDrop(props: FileDropProps) {
    return (
        <FileUpload.Root
            accept={props.accept}
            maxFiles={1}
            maxFileSize={props.maxFileSize}
            disabled={props.disabled}
            class={cn('min-w-0', props.classes?.root)}
            onFileAccept={details => {
                const file = details.files[0]
                if (file) {
                    props.onAccept(file)
                }
            }}
            onFileReject={details => {
                const rejection = details.files[0]
                if (rejection) {
                    props.onReject(rejection)
                }
            }}
        >
            {/* Dropzone 同時給拖放與點擊兩種手勢，一個元素就夠 */}
            <FileUpload.Dropzone
                class={cn(
                    'flex cursor-pointer flex-col items-center justify-center gap-1.5 rounded-md border border-dashed border-line px-3 py-6 text-center text-fg-muted',
                    'hover:border-white/20 hover:bg-white/[0.015]',
                    'data-[dragging]:border-accent data-[dragging]:bg-accent/10 data-[dragging]:text-accent-fg',
                    'data-[disabled]:cursor-default data-[disabled]:opacity-50',
                    props.classes?.dropzone,
                )}
            >
                {props.children}
            </FileUpload.Dropzone>
            <FileUpload.HiddenInput />
        </FileUpload.Root>
    )
}
