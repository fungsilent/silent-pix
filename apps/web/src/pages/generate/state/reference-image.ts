import { batch, createEffect, on, onCleanup } from 'solid-js'

import { createLocalReferenceImage, referenceSize } from '#/pages/generate/form'

import type { createGenerateForm, ReferenceImage } from '#/pages/generate/form'
import type { Accessor } from 'solid-js'

type ReferenceImageOptions = {
    form: ReturnType<typeof createGenerateForm>
    selectedTaskId: Accessor<string | undefined>
}

/* 參考圖與遮罩的 object URL：建立與 revoke。parkedValues 的參考圖由 session 交給 release */
export function createReferenceImage(options: ReferenceImageOptions) {
    const { form } = options
    let pendingPreviewUrl: string | undefined

    function cancelUpload(): void {
        if (pendingPreviewUrl === undefined) return

        URL.revokeObjectURL(pendingPreviewUrl)
        pendingPreviewUrl = undefined
    }

    function release(reference: ReferenceImage | null | undefined): void {
        if (reference?.type === 'local') {
            URL.revokeObjectURL(reference.previewUrl)
        }
        if (reference?.mask?.type === 'local') {
            URL.revokeObjectURL(reference.mask.previewUrl)
        }
    }

    const set = (reference: ReferenceImage) => {
        const size = referenceSize(reference)

        cancelUpload()
        release(form.getFieldValue('referenceImage'))
        batch(() => {
            form.setFieldValue('referenceImage', reference)
            form.setFieldValue('width', size.width)
            form.setFieldValue('height', size.height)
        })
    }

    const clear = () => {
        cancelUpload()
        release(form.getFieldValue('referenceImage'))
        form.setFieldValue('referenceImage', null)
    }

    const upload = (file: File, onUnreadable: () => void) => {
        cancelUpload()
        const previewUrl = URL.createObjectURL(file)
        const taskId = options.selectedTaskId()
        const isCurrent = () => pendingPreviewUrl === previewUrl && options.selectedTaskId() === taskId
        pendingPreviewUrl = previewUrl

        const probe = new Image()
        probe.addEventListener('load', () => {
            if (!isCurrent()) return

            pendingPreviewUrl = undefined
            set(createLocalReferenceImage(file, probe.naturalWidth, probe.naturalHeight, previewUrl))
        })
        probe.addEventListener('error', () => {
            if (!isCurrent()) return

            cancelUpload()
            onUnreadable()
        })
        probe.src = previewUrl
    }

    const setMask = (reference: ReferenceImage, file: File | null) => {
        if (form.getFieldValue('referenceImage') !== reference) return

        const mask = file ? { type: 'local' as const, file, previewUrl: URL.createObjectURL(file) } : null
        if (reference.mask?.type === 'local') {
            URL.revokeObjectURL(reference.mask.previewUrl)
        }
        form.setFieldValue('referenceImage', { ...reference, mask })
    }

    createEffect(on(options.selectedTaskId, cancelUpload, { defer: true }))

    onCleanup(() => {
        cancelUpload()
        release(form.getFieldValue('referenceImage'))
    })

    return { cancelUpload, release, set, clear, upload, setMask }
}
