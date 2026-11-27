import { createEffect, createSignal, on, Show } from 'solid-js'

import { TaskDetail } from '#/components/task/detail/TaskDetail'
import { useDeleteTaskMutation, useLoraListQuery, useRenameTaskMutation, useSamplerListQuery } from '#/data/task/task.query'
import { useWorkflowListQuery } from '#/data/workflow/workflow.query'
import { t } from '#/lib/i18n'
import { MaskEditor } from '#/pages/generate/components/mask/MaskEditor'
import {
    referencePreviewUrl,
    referenceSize,
} from '#/pages/generate/form'
import { useGenerateDetail } from '#/pages/generate/state/detail'
import { useGenerateSession } from '#/pages/generate/state/session'
import { createIssueSource, toFailureIssue } from '#/store/issue'

import type { ImageApi } from '@silent-pix/shared'
import type { TaskConfigActions, TaskConfigCreateData, TaskConfigValues } from '#/components/task/detail/TaskConfig'
import type { TaskDetailCreateActions, TaskDetailCreateData } from '#/components/task/detail/TaskDetail'
import type { TaskImageActions, TaskImageCreateData, TaskImageReference } from '#/components/task/detail/TaskImage'
import type { TaskInfoActions, TaskInfoCreateData } from '#/components/task/detail/TaskInfo'
import type { TaskLoraActions, TaskLoraCreateData } from '#/components/task/detail/TaskLora'
import type { ReferenceImage } from '#/pages/generate/form'
import type { DraftDefaultField } from '#/pages/generate/state/session'

const draftFieldLabel: Record<DraftDefaultField, () => string> = {
    seed: () => t('fields.seed'),
    steps: () => t('fields.steps'),
    cfg: () => t('fields.cfg'),
    sampler: () => t('fields.sampler'),
    width: () => t('fields.width'),
    height: () => t('fields.height'),
    batch: () => t('fields.batch'),
    denoise: () => t('fields.denoise'),
    positive: () => t('fields.positive'),
    negative: () => t('fields.negative'),
}

type GenerateTaskDetailProps = {
    bare?: boolean
}

export function GenerateTaskDetail(props: GenerateTaskDetailProps) {
    const generateSession = useGenerateSession()
    const form = generateSession.form
    const detail = useGenerateDetail()
    const samplerQuery = useSamplerListQuery()
    const workflowQuery = useWorkflowListQuery()
    const renameMutation = useRenameTaskMutation()
    const deleteMutation = useDeleteTaskMutation()
    const [imagePickerOpen, setImagePickerOpen] = createSignal(false)
    const [loraPickerOpen, setLoraPickerOpen] = createSignal(false)
    const [editingMask, setEditingMask] = createSignal<ReferenceImage>()
    const [renameError, setRenameError] = createSignal<unknown>()
    createIssueSource(() => toFailureIssue('task-rename', () => t('common.detail'), renameError(), () => setRenameError()))
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
            ? [{ badge: t('task.archived'), label: archived.name, value: archived.id }, ...options]
            : options
    }

    const samplerOptions = () => samplerQuery.data?.options ?? []

    createEffect(() => {
        if (!detail.draft() || !generateSession.isSelectionLoaded()) return

        const options = workflowOptions()
        const first = options[0]

        if (!first) return

        const current = workflowId()
        if (!current || !options.some(option => option.value === current)) {
            form.setFieldValue('workflowId', first.value)
        }
    })

    const normalizeReference = (reference: ReferenceImage): TaskImageReference => {
        const size = referenceSize(reference)
        const mask = reference.mask

        return {
            url: referencePreviewUrl(reference),
            width: size.width,
            height: size.height,
            origin: reference.type === 'asset' ? reference.origin : null,
            maskUrl: mask?.type === 'local' ? mask.previewUrl : mask?.image.url ?? null,
        }
    }

    const reference = () => {
        const current = referenceImage()
        return current ? normalizeReference(current) : null
    }

    createEffect(on(referenceImage, () => setEditingMask()))

    createEffect(on(() => detail.task()?.id, () => setRenameError()))

    const onReferenceAsset = (item: ImageApi.ImageListItem) => {
        generateSession.setReferenceImage({
            type: 'asset',
            image: item.image,
            origin: item.origin,
            mask: null,
        })
    }

    const onNameChange = (value: string) => {
        setRenameError()
        form.setFieldValue('name', value)
    }

    const onNameCommit = async (value: string) => {
        setRenameError()
        const current = detail.task()

        if (!current || renameMutation.isPending) {
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
            setRenameError(() => cause)
        }
    }

    const onDeleteTask = async () => {
        const current = detail.task()

        if (!current) {
            return
        }

        await deleteMutation.mutateAsync({ taskId: current.id })
    }

    /* 草稿沿用來源 task 的 seed 作參考 */
    const seedTask = () => detail.task() ?? detail.sourceTask()

    const onRestoreSeed = () => {
        const restored = seedTask()?.config.seed

        if (restored) {
            form.setFieldValue('seed', restored)
        }
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

    const configValues = (): TaskConfigValues => ({
        workflowId: workflowId(),
        seed: seed(),
        seedPlaceholder: seedTask()?.config.seed ?? t('common.random'),
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
        errorCode: () => detail.task()?.errorCode,
        errorMessage: () => detail.task()?.errorMessage,
        createdAt: () => detail.task()?.createdAt,
        draft: detail.draft,
        draftSource: () => {
            const source = generateSession.state.draft?.source
            if (source?.kind === 'task') return { kind: 'task', taskId: source.taskId }
            if (source?.kind === 'metadata') {
                return {
                    kind: 'metadata',
                    fileName: source.fileName,
                    defaults: source.defaults.map(item => ({ label: draftFieldLabel[item.field](), value: item.value })),
                }
            }
            return undefined
        },
        imageCount: () => detail.task()?.images.length ?? 0,
        renamePending: () => renameMutation.isPending,
        deletePending: () => deleteMutation.isPending,
    }
    const imageData: TaskImageCreateData = {
        reference,
        denoise,
        imagePickerOpen,
        referenceError: () => generateSession.referenceImageError()?.(),
    }
    const configData: TaskConfigCreateData = {
        values: configValues,
        workflowOptions,
        samplerOptions,
        hasReference: () => referenceImage() !== null,
        restorableSeed: () => seedTask()?.config.seed ?? null,
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
        onReferenceFile: generateSession.uploadReferenceImage,
        onReferenceReject: generateSession.rejectReferenceImage,
        onReferenceAsset,
        onRemoveReference: generateSession.clearReferenceImage,
        onEditMask: () => setEditingMask(referenceImage() ?? undefined),
        onClearMask: () => {
            const current = referenceImage()
            if (current) generateSession.setReferenceMask(current, null)
        },
        onSelectOrigin: generateSession.selectTask,
        onDenoiseChange: value => form.setFieldValue('denoise', value),
        setImagePickerOpen,
    }
    const configActions: TaskConfigActions = {
        onWorkflowChange: value => form.setFieldValue('workflowId', value),
        onSeedChange: value => form.setFieldValue('seed', value),
        onRestoreSeed,
        onStepsChange: value => form.setFieldValue('steps', value),
        onCfgChange: value => form.setFieldValue('cfg', value),
        onWidthChange: value => form.setFieldValue('width', value),
        onHeightChange: value => form.setFieldValue('height', value),
        onBatchChange: value => form.setFieldValue('batch', value),
        onSamplerChange: value => form.setFieldValue('sampler', value),
    }
    const loraActions: TaskLoraActions = {
        onWeightChange: onLoraWeightChange,
        onRemove: onRemoveLora,
        onSelection: generateSession.applyLoraSelection,
        onRetry: () => { void loraQuery.refetch() },
        setPickerOpen: setLoraPickerOpen,
    }
    const actions: TaskDetailCreateActions = {
        info: infoActions,
        image: imageActions,
        config: configActions,
        lora: loraActions,
    }

    return (
        <>
            <TaskDetail
                mode='create'
                data={data}
                actions={actions}
                error={() => detail.error() && detail.task() === undefined}
                loading={detail.loading}
                onRetry={detail.retry}
                bare={props.bare}
            />
            <Show
                when={!detail.loading() && editingMask()}
                keyed
            >
                {source => (
                    <MaskEditor
                        reference={normalizeReference(source)}
                        onClose={() => setEditingMask()}
                        onDone={file => {
                            generateSession.setReferenceMask(source, file)
                            setEditingMask()
                        }}
                    />
                )}
            </Show>
        </>
    )
}
