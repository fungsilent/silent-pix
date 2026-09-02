import { createEffect, createSignal, on, onCleanup } from 'solid-js'

import { TaskDetail } from '#/components/task/TaskDetail'
import { useDeleteTaskMutation, useLoraListQuery, useRenameTaskMutation, useSamplerListQuery } from '#/features/task/task.query'
import { useWorkflowListQuery } from '#/features/workflow/workflow.query'
import { toErrorMessage } from '#/lib/error'
import { useGenerateDetail } from '#/pages/generate/detail'
import {
    referencePreviewUrl,
    referenceSize,
} from '#/pages/generate/form'
import { useGenerateStore } from '#/pages/generate/store'

import type { ImageApi } from '@silent-pix/shared'
import type { TaskConfigActions, TaskConfigCreateData, TaskConfigValues } from '#/components/task/detail/TaskConfig'
import type { TaskImageActions, TaskImageCreateData, TaskImageReference } from '#/components/task/detail/TaskImage'
import type { TaskInfoActions, TaskInfoCreateData } from '#/components/task/detail/TaskInfo'
import type { TaskLoraActions, TaskLoraCreateData } from '#/components/task/detail/TaskLora'
import type { TaskDetailCreateActions, TaskDetailCreateData } from '#/components/task/TaskDetail'
import type { ReferenceImage } from '#/pages/generate/form'

export function GenerateTaskDetail() {
    const store = useGenerateStore()
    const form = store.form
    const detail = useGenerateDetail()
    const samplerQuery = useSamplerListQuery()
    const workflowQuery = useWorkflowListQuery()
    const renameMutation = useRenameTaskMutation()
    const deleteMutation = useDeleteTaskMutation()
    const [imagePickerOpen, setImagePickerOpen] = createSignal(false)
    const [loraPickerOpen, setLoraPickerOpen] = createSignal(false)
    const [referenceError, setReferenceError] = createSignal<string>()
    const [renameError, setRenameError] = createSignal<string>()
    const loraQuery = useLoraListQuery(loraPickerOpen)

    const name = form.useSelector(({ values }) => values.name)
    const workflowId = form.useSelector(({ values }) => values.workflowId)
    const seed = form.useSelector(({ values }) => values.seed)
    const steps = form.useSelector(({ values }) => values.steps)
    const cfg = form.useSelector(({ values }) => values.cfg)
    const width = form.useSelector(({ values }) => values.width)
    const height = form.useSelector(({ values }) => values.height)
    const batch = form.useSelector(({ values }) => values.batch)
    const sampler = form.useSelector(({ values }) => values.sampler)
    const denoise = form.useSelector(({ values }) => values.denoise)
    const referenceImage = form.useSelector(({ values }) => values.referenceImage)
    const lora = form.useSelector(({ values }) => values.lora)

    const activeWorkflowOptions = () => workflowQuery.data?.options
        .filter(workflow => workflow.archivedAt === null)
        .map(workflow => ({ label: workflow.name, value: workflow.id })) ?? []

    const workflowOptions = () => {
        const options = activeWorkflowOptions()
        const current = workflowId()

        if (!current || options.some(option => option.value === current)) {
            return options
        }

        const archived = workflowQuery.data?.options.find(workflow => workflow.id === current)

        return archived
            ? [{ badge: 'archived', label: archived.name, value: archived.id }, ...options]
            : options
    }

    const samplerOptions = () => samplerQuery.data?.options ?? []

    const normalizeReference = (reference: ReferenceImage | null): TaskImageReference | null => {
        if (!reference) {
            return null
        }

        const size = referenceSize(reference)

        return {
            url: referencePreviewUrl(reference),
            width: size.width,
            height: size.height,
            origin: reference.type === 'asset' ? reference.origin : null,
        }
    }

    const reference = () => normalizeReference(referenceImage())

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
    createEffect(on(() => detail.task()?.id, () => {
        releasePendingProbe()
        setReferenceError()
        setRenameError()
    }))

    onCleanup(() => {
        releasePendingProbe()
    })

    const onReferenceFile = (file: File) => {
        releasePendingProbe()
        setReferenceError()

        const previewUrl = URL.createObjectURL(file)
        const currentTaskId = detail.task()?.id
        const currentProbeToken = probeToken
        pendingPreviewUrl = previewUrl
        const probe = new Image()

        probe.addEventListener('load', () => {
            if (currentProbeToken !== probeToken || currentTaskId !== detail.task()?.id) {
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
            if (currentProbeToken !== probeToken || currentTaskId !== detail.task()?.id) {
                revokePendingPreview(previewUrl)
                return
            }

            revokePendingPreview(previewUrl)
            setReferenceError('That file could not be read as an image.')
        })
        probe.src = previewUrl
    }

    const onReferenceReject = (message: string) => {
        setReferenceError(message)
    }

    const onReferenceAsset = (item: ImageApi.ImageListItem) => {
        releasePendingProbe()
        setReferenceError()
        store.setReferenceImage({
            type: 'asset',
            image: item.image,
            origin: item.origin,
        })
    }

    const onRemoveReference = () => {
        releasePendingProbe()
        store.clearReferenceImage()
    }

    const onDenoiseChange = (value: number) => {
        form.setFieldValue('denoise', value)
    }

    const onNameChange = (value: string) => {
        setRenameError()
        form.setFieldValue('name', value)
    }

    const onNameCommit = async (value: string) => {
        setRenameError()
        const current = detail.task()

        if (!current || current.status === null || renameMutation.isPending) {
            return
        }

        const currentName = current.name ?? ''
        if (value === currentName) {
            return
        }

        try {
            await renameMutation.mutateAsync({
                taskId: current.id,
                name: value === '' ? null : value,
            })
        }
        catch (cause) {
            setRenameError(toErrorMessage(cause))
        }
    }

    const onDeleteTask = async () => {
        const current = detail.task()

        if (!current) {
            return
        }

        await deleteMutation.mutateAsync({ taskId: current.id })
    }

    const onWorkflowChange = (value: string) => {
        form.setFieldValue('workflowId', value)
    }

    const onSeedChange = (value: string) => {
        form.setFieldValue('seed', value)
    }

    const onRestoreSeed = () => {
        const restored = detail.task()?.config.seed

        if (restored) {
            form.setFieldValue('seed', restored)
        }
    }

    const onStepsChange = (value: number) => {
        form.setFieldValue('steps', value)
    }

    const onCfgChange = (value: number) => {
        form.setFieldValue('cfg', value)
    }

    const onWidthChange = (value: number) => {
        form.setFieldValue('width', value)
    }

    const onHeightChange = (value: number) => {
        form.setFieldValue('height', value)
    }

    const onBatchChange = (value: number) => {
        form.setFieldValue('batch', value)
    }

    const onSamplerChange = (value: string) => {
        form.setFieldValue('sampler', value)
    }

    const onLoraWeightChange = (index: number, value: number) => {
        const current = form.getFieldValue('lora')
        form.setFieldValue('lora', current.map((item, itemIndex) => itemIndex === index
            ? { ...item, weight: value }
            : item))
    }

    const onRemoveLora = (index: number) => {
        const current = form.getFieldValue('lora')
        form.setFieldValue('lora', current.filter((_, itemIndex) => itemIndex !== index))
    }

    const onLoraSelection = (names: string[]) => {
        store.applyLoraSelection(names)
    }

    const onRetryLora = () => {
        void loraQuery.refetch()
    }

    const configValues = (): TaskConfigValues => ({
        workflowId: workflowId(),
        seed: seed(),
        seedPlaceholder: detail.task()?.config.seed ?? 'Random',
        steps: steps(),
        cfg: cfg(),
        width: width(),
        height: height(),
        batch: batch(),
        sampler: sampler(),
    })

    const infoData: TaskInfoCreateData = {
        id: () => detail.task()?.id,
        name,
        status: () => detail.task()?.status,
        createdAt: () => detail.task()?.createdAt,
        imageCount: () => detail.task()?.images.length ?? 0,
        renameError,
        renamePending: () => renameMutation.isPending,
        deletePending: () => deleteMutation.isPending,
    }
    const imageData: TaskImageCreateData = {
        reference,
        denoise,
        imagePickerOpen,
        referenceError,
    }
    const configData: TaskConfigCreateData = {
        values: configValues,
        workflowOptions,
        samplerOptions,
        hasReference: () => referenceImage() !== null,
        isDraft: () => detail.task()?.status === null,
        restorableSeed: () => detail.task()?.config.seed ?? null,
        workflowLoading: () => workflowQuery.isLoading,
        workflowError: () => workflowQuery.isError,
        samplerLoading: () => samplerQuery.isLoading,
        samplerError: () => samplerQuery.isError,
    }
    const loraData: TaskLoraCreateData = {
        loras: lora,
        pickerOpen: loraPickerOpen,
        options: () => loraQuery.data?.options ?? [],
        loading: () => loraQuery.isLoading,
        error: () => loraQuery.isError && loraQuery.data === undefined,
    }
    const data: TaskDetailCreateData = {
        info: infoData,
        image: imageData,
        config: configData,
        lora: loraData,
    }

    const infoActions: TaskInfoActions = {
        onNameChange,
        onNameCommit: value => void onNameCommit(value),
        onDeleteTask,
    }
    const imageActions: TaskImageActions = {
        onReferenceFile,
        onReferenceReject,
        onReferenceAsset,
        onRemoveReference,
        onDenoiseChange,
        setImagePickerOpen,
    }
    const configActions: TaskConfigActions = {
        onWorkflowChange,
        onSeedChange,
        onRestoreSeed,
        onStepsChange,
        onCfgChange,
        onWidthChange,
        onHeightChange,
        onBatchChange,
        onSamplerChange,
    }
    const loraActions: TaskLoraActions = {
        onWeightChange: onLoraWeightChange,
        onRemove: onRemoveLora,
        onSelection: onLoraSelection,
        onRetry: onRetryLora,
        setPickerOpen: setLoraPickerOpen,
    }
    const actions: TaskDetailCreateActions = {
        info: infoActions,
        image: imageActions,
        config: configActions,
        lora: loraActions,
    }

    return (
        <TaskDetail
            mode='create'
            data={data}
            actions={actions}
            error={() => detail.error() && detail.task() === undefined}
            loading={detail.loading}
        />
    )
}
