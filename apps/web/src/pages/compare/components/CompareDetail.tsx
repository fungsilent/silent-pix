import { createMemo, Show } from 'solid-js'

import { Bar } from '#/components/base/Bar'
import { CollapseButton, CollapsedBar, Panel, PanelContent } from '#/components/base/Panel'
import { TaskDetail } from '#/components/task/detail/TaskDetail'
import { useTaskDetailQuery } from '#/features/task/task.query'
import { ReferenceImageDetail } from '#/pages/compare/components/ReferenceImageDetail'
import { compareStore } from '#/store/compare'

import type { TaskConfigData, TaskConfigValues } from '#/components/task/detail/TaskConfig'
import type { TaskDetailViewData } from '#/components/task/detail/TaskDetail'
import type { TaskImageData, TaskImageReference } from '#/components/task/detail/TaskImage'
import type { TaskInfoData } from '#/components/task/detail/TaskInfo'
import type { TaskLoraData } from '#/components/task/detail/TaskLora'

export function CompareDetail() {
    const selected = createMemo(() => compareStore.selectedCompare())
    const taskId = createMemo(() => {
        const origin = selected()?.origin
        return origin?.type === 'output' ? origin.taskId : undefined
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
        createdAt: () => task()?.createdAt,
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
                seedPlaceholder: current?.config.seed ?? 'Random',
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
                    value: current.workflowId ?? '',
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
            fallback={<DetailStatus />}
        >
            {entry => (
                <Show
                    when={entry().origin?.type === 'output'}
                    fallback={<ReferenceImageDetail image={entry().image} />}
                >
                    <TaskDetail
                        mode='view'
                        data={data}
                        error={() => Boolean(taskId()) && taskDetailQuery.isError && task() === undefined}
                        loading={() => taskId() !== undefined && taskDetailQuery.isLoading}
                    />
                </Show>
            )}
        </Show>
    )
}

type DetailStatusProps = {
    message?: string | undefined
}

function DetailStatus(props: DetailStatusProps) {
    return (
        <Panel
            classes={{
                root: 'border-l border-line bg-surface max-[980px]:hidden',
                open: 'w-[350px]',
                close: 'w-10',
            }}
        >
            {panel => (
                panel.isCollapsed() ? (
                    <CollapsedBar onClick={panel.toggle} />
                ) : (
                    <div class='flex h-full min-h-0 flex-col'>
                        <Bar.Root classes={{ root: 'px-2' }}>
                            <Bar.Group>
                                <Bar.Title>Detail</Bar.Title>
                            </Bar.Group>
                            <Bar.Actions>
                                <CollapseButton
                                    collapsed={panel.isCollapsed()}
                                    onClick={panel.toggle}
                                />
                            </Bar.Actions>
                        </Bar.Root>
                        <PanelContent>
                            {props.message && (
                                <p class='m-0 py-4 text-center text-xs text-fg-muted'>
                                    {props.message}
                                </p>
                            )}
                        </PanelContent>
                    </div>
                )
            )}
        </Panel>
    )
}
