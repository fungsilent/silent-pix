import { batch, createEffect, createSignal, on, onCleanup } from 'solid-js'

import { t } from '#/lib/i18n'
import { createLocalReferenceImage, referenceSize } from '#/pages/generate/form'

import type { createGenerateForm, ReferenceImage } from '#/pages/generate/form'
import type { Accessor } from 'solid-js'

type ReferenceImageOptions = {
    form: ReturnType<typeof createGenerateForm>
    selectedTaskId: Accessor<string | undefined>
}

export function createReferenceImage(options: ReferenceImageOptions) {
    const { form } = options
    let pendingPreviewUrl: string | undefined
    const [error, setError] = createSignal<() => string>()

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
        setError()
        release(form.getFieldValue('referenceImage'))
        batch(() => {
            form.setFieldValue('referenceImage', reference)
            form.setFieldValue('width', size.width)
            form.setFieldValue('height', size.height)
        })
    }

    const clear = () => {
        cancelUpload()
        setError()
        release(form.getFieldValue('referenceImage'))
        form.setFieldValue('referenceImage', null)
    }

    const upload = (file: File) => {
        cancelUpload()
        setError()
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
            setError(() => () => t('image.unreadable'))
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

    /* 拖入的檔案在送出前就被拒絕（格式不符等） */
    const reject = (message: () => string) => {
        cancelUpload()
        setError(() => message)
    }

    /* 表單換內容（載入 task、開新或回到草稿）：取消解碼並清掉失敗訊息；切換版面不會呼叫 */
    const reset = () => {
        cancelUpload()
        setError()
    }

    createEffect(on(options.selectedTaskId, reset, { defer: true }))

    onCleanup(() => {
        cancelUpload()
        release(form.getFieldValue('referenceImage'))
    })

    return { error, cancelUpload, reset, release, set, clear, upload, reject, setMask }
}
