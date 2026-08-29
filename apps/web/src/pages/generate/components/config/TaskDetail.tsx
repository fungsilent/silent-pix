import { Show } from 'solid-js'

import { Line } from '#/components/base/Line'
import { CollapseButton, CollapsedBar, Panel, PanelContent, PanelHeader } from '#/components/base/Panel'
import { TaskConfig } from '#/pages/generate/components/config/TaskConfig'
import { type TaskDetailMode } from '#/pages/generate/components/config/TaskDetailMode'
import { TaskImage } from '#/pages/generate/components/config/TaskImage'
import { TaskInfo } from '#/pages/generate/components/config/TaskInfo'
import { TaskLora } from '#/pages/generate/components/config/TaskLora'
import { useGenerateDetail } from '#/pages/generate/detail'

export type { TaskDetailMode } from '#/pages/generate/components/config/TaskDetailMode'

type TaskDetailProps = {
    mode: TaskDetailMode
}

export function TaskDetail(props: TaskDetailProps) {
    const detail = useGenerateDetail()
    const hasError = () => detail.error() && detail.task() === undefined

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
                            <Show when={hasError()}>
                                <p class='m-0 py-8 text-center text-sm text-red-300'>
                                    Failed to load task detail.
                                </p>
                            </Show>

                            <Show when={!hasError()}>
                                <TaskInfo mode={props.mode} />
                                <Line />
                                <TaskImage mode={props.mode} />
                                <Line />
                                <TaskConfig mode={props.mode} />
                                <Line />
                                <TaskLora mode={props.mode} />
                            </Show>
                        </PanelContent>
                    </div>
                )
            )}
        </Panel>
    )
}
