import { Show } from 'solid-js'

import { Line } from '#/components/base/Line'
import { CollapseButton, CollapsedBar, Panel, PanelContent, PanelHeader } from '#/components/base/Panel'
import { TaskConfig } from '#/components/task/detail/TaskConfig'
import { TaskImage } from '#/components/task/detail/TaskImage'
import { TaskInfo } from '#/components/task/detail/TaskInfo'
import { TaskLora } from '#/components/task/detail/TaskLora'

import type { TaskConfigActions, TaskConfigCreateData, TaskConfigData } from '#/components/task/detail/TaskConfig'
import type { TaskImageActions, TaskImageCreateData, TaskImageData } from '#/components/task/detail/TaskImage'
import type { TaskInfoActions, TaskInfoCreateData, TaskInfoData } from '#/components/task/detail/TaskInfo'
import type { TaskLoraActions, TaskLoraCreateData, TaskLoraData } from '#/components/task/detail/TaskLora'
import type { Accessor, JSX } from 'solid-js'

export type TaskDetailCreateData = {
    info: TaskInfoCreateData
    image: TaskImageCreateData
    config: TaskConfigCreateData
    lora: TaskLoraCreateData
}

export type TaskDetailViewData = {
    info: TaskInfoData
    image: TaskImageData
    config: TaskConfigData
    lora: TaskLoraData
}

export type TaskDetailCreateActions = {
    info: TaskInfoActions
    image: TaskImageActions
    config: TaskConfigActions
    lora: TaskLoraActions
}

type TaskDetailProps = {
    mode: 'create'
    data: TaskDetailCreateData
    actions: TaskDetailCreateActions
    error: Accessor<boolean>
    loading: Accessor<boolean>
} | {
    mode: 'view'
    data: TaskDetailViewData
    error: Accessor<boolean>
    loading: Accessor<boolean>
}

export function TaskDetail(props: TaskDetailProps) {
    const hasError = () => props.error() && props.data.info.id() === undefined

    return (
        <TaskDetailPanel
            error={hasError}
            loading={props.loading}
        >
            <TaskDetailContent {...props} />
        </TaskDetailPanel>
    )
}

function TaskDetailContent(props: TaskDetailProps) {
    if (props.mode === 'create') {
        return (
            <>
                <TaskInfo
                    mode='create'
                    data={props.data.info}
                    actions={props.actions.info}
                    loading={props.loading}
                />
                <Line />
                <TaskImage
                    mode='create'
                    data={props.data.image}
                    actions={props.actions.image}
                    loading={props.loading}
                />
                <Line />
                <TaskConfig
                    mode='create'
                    data={props.data.config}
                    actions={props.actions.config}
                    loading={props.loading}
                />
                <Line />
                <TaskLora
                    mode='create'
                    data={props.data.lora}
                    actions={props.actions.lora}
                    loading={props.loading}
                />
            </>
        )
    }

    return (
        <>
            <TaskInfo
                mode='view'
                data={props.data.info}
                loading={props.loading}
            />
            <Line />
            <TaskImage
                mode='view'
                data={props.data.image}
                loading={props.loading}
            />
            <Line />
            <TaskConfig
                mode='view'
                data={props.data.config}
                loading={props.loading}
            />
            <Line />
            <TaskLora
                mode='view'
                data={props.data.lora}
                loading={props.loading}
            />
        </>
    )
}

type TaskDetailPanelProps = {
    children: JSX.Element
    error: Accessor<boolean>
    loading: Accessor<boolean>
}

function TaskDetailPanel(props: TaskDetailPanelProps) {
    return (
        <Panel
            classes={{
                root: 'border-l border-line bg-surface max-[980px]:hidden',
                // 350 是讓 ID 欄位能完整顯示 36 字元 UUID 的最小寬度
                open: 'w-[350px]',
                close: 'w-10',
            }}
        >
            {panel => (
                panel.isCollapsed() ? (
                    <CollapsedBar onClick={panel.toggle} />
                ) : (
                    <div class='flex h-full min-h-0 flex-col'>
                        <PanelHeader
                            title='Detail'
                            action={(
                                <CollapseButton
                                    collapsed={panel.isCollapsed()}
                                    onClick={panel.toggle}
                                />
                            )}
                        />
                        <PanelContent
                            classes={{
                                content: 'gap-3 px-4 pt-0 pb-5',
                            }}
                        >
                            <Show when={!props.error()}>
                                <div
                                    class='contents'
                                >
                                    {props.children}
                                </div>
                            </Show>
                            <Show when={props.error()}>
                                <p class='m-0 py-4 text-center text-xs text-fg-muted'>
                                    Failed to load task detail.
                                </p>
                            </Show>
                        </PanelContent>
                    </div>
                )
            )}
        </Panel>
    )
}
