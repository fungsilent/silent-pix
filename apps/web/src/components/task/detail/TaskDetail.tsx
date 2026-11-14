import { Show } from 'solid-js'

import { Line } from '#/components/base/Line'
import { StatusMessage } from '#/components/base/StatusMessage'
import { DetailPanel } from '#/components/detail'
import { TaskConfig } from '#/components/task/detail/TaskConfig'
import { TaskImage } from '#/components/task/detail/TaskImage'
import { TaskInfo } from '#/components/task/detail/TaskInfo'
import { TaskLora } from '#/components/task/detail/TaskLora'
import { t } from '#/lib/i18n'

import type { PanelCollapse } from '#/components/base/Panel'
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

type TaskDetailProps = ({
    mode: 'create'
    data: TaskDetailCreateData
    actions: TaskDetailCreateActions
} | {
    mode: 'view'
    data: TaskDetailViewData
}) & {
    error: Accessor<boolean>
    loading: Accessor<boolean>
    onRetry: () => void
    collapse?: PanelCollapse | undefined
}

export function TaskDetail(props: TaskDetailProps) {
    const hasError = () => props.error() && props.data.info.id() === undefined

    return (
        <TaskDetailPanel
            error={hasError}
            onRetry={props.onRetry}
            collapse={props.collapse}
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
    onRetry: () => void
    collapse: PanelCollapse | undefined
}

function TaskDetailPanel(props: TaskDetailPanelProps) {
    return (
        <DetailPanel collapse={props.collapse}>
            <Show when={!props.error()}>
                <div
                    class='contents'
                >
                    {props.children}
                </div>
            </Show>
            <Show when={props.error()}>
                <StatusMessage
                    kind='load-error'
                    size='compact'
                    message={t('task.loadDetailFailed')}
                    onRetry={props.onRetry}
                />
            </Show>
        </DetailPanel>
    )
}
