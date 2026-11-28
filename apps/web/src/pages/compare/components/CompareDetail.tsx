import { createMemo, Show } from 'solid-js'

import { createStoredCollapse } from '#/components/base/Panel'
import { TaskDetail } from '#/components/task/detail/TaskDetail'
import { useTaskDetailQuery } from '#/data/task/task.query'
import { t } from '#/lib/i18n'
import { storageKeys } from '#/lib/storage'
import { ReferenceImageDetail } from '#/pages/compare/components/ReferenceImageDetail'
import { useCompareSession } from '#/pages/compare/state/session'

import type { TaskConfigData, TaskConfigValues } from '#/components/task/detail/TaskConfig'
import type { TaskDetailViewData } from '#/components/task/detail/TaskDetail'
import type { TaskImageData, TaskImageReference } from '#/components/task/detail/TaskImage'
import type { TaskInfoData } from '#/components/task/detail/TaskInfo'
import type { TaskLoraData } from '#/components/task/detail/TaskLora'

export function CompareDetail(props: { bare?: boolean }) {
    const collapse = createStoredCollapse(storageKeys.compare.detailCollapsed)
    const compareSession = useCompareSession()
    const selected = createMemo(() => compareSession.selectedCompare())
    const taskId = createMemo(() => {
        const usage = selected()?.usage
        return usage?.type === 'output' ? usage.taskId : undefined
    })
    const taskDetailQuery = useTaskDetailQuery(taskId)
    const task = createMemo(() => {
        const task = taskDetailQuery.data

        if (!task || task.id !== taskId()) {
            return undefined
        }

        return task
    })
    const info: TaskInfoData = {
        id: () => task()?.id,
        name: () => task()?.name ?? '',
        status: () => task()?.status,
        errorCode: () => task()?.errorCode,
        errorMessage: () => task()?.errorMessage,
        createdAt: () => task()?.createdAt,
        image: () => {
            const entry = selected()
            return entry && task() ? { id: entry.image.id, position: undefined } : undefined
        },
    }
    const image: TaskImageData = {
        reference: (): TaskImageReference | null => {
            const current = task()
            const reference = current?.referenceImage

            return reference
                ? {
                    url: reference.image.url,
                    width: reference.image.width,
                    height: reference.image.height,
                    origin: reference.origin,
                    maskUrl: reference.mask?.url ?? null,
                }
                : null
        },
        denoise: () => task()?.config.denoise ?? 0,
    }
    const config: TaskConfigData = {
        values: (): TaskConfigValues => {
            const current = task()

            return {
                workflowId: current?.workflowId ?? '',
                seed: '',
                seedPlaceholder: current?.config.seed ?? t('common.random'),
                steps: current?.config.steps ?? 0,
                cfg: current?.config.cfg ?? 0,
                width: current?.config.width ?? 0,
                height: current?.config.height ?? 0,
                batch: current?.config.batch ?? 0,
                sampler: current?.config.sampler ?? '',
            }
        },
        workflowOptions: () => {
            const current = task()

            return current
                ? [{
                    label: current.workflow || current.workflowId || '-',
                    value: current.workflowId,
                }]
                : []
        },
        samplerOptions: () => {
            const current = task()

            return current ? [{ label: current.config.sampler, value: current.config.sampler }] : []
        },
    }
    const lora: TaskLoraData = {
        loras: () => task()?.lora ?? [],
    }
    const data: TaskDetailViewData = { info, image, config, lora }

    return (
        <Show
            when={selected()}
            fallback={<ReferenceImageDetail collapse={collapse} />}
        >
            {entry => (
                <Show
                    when={entry().usage?.type === 'output'}
                    fallback={(
                        <ReferenceImageDetail
                            image={entry().image}
                            collapse={collapse}
                            bare={props.bare}
                        />
                    )}
                >
                    <TaskDetail
                        mode='view'
                        data={data}
                        error={() => Boolean(taskId()) && taskDetailQuery.isError && task() === undefined}
                        loading={() => taskId() !== undefined && taskDetailQuery.isLoading}
                        onRetry={() => void taskDetailQuery.refetch()}
                        collapse={collapse}
                        bare={props.bare}
                    />
                </Show>
            )}
        </Show>
    )
}
