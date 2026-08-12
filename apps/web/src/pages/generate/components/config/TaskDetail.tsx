import { Line } from '#/components/base/Line'
import { CollapseButton, Panel, PanelContent, PanelHeader } from '#/components/base/Panel'
import { TaskConfig } from '#/pages/generate/components/config/TaskConfig'
import { TaskInfo } from '#/pages/generate/components/config/TaskInfo'
import { TaskLora } from '#/pages/generate/components/config/TaskLora'

import type { GenerateTask } from '#/pages/generate/store'

type TaskDetailProps = {
    task: GenerateTask
}

export function TaskDetail(props: TaskDetailProps) {
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
                    <div class='flex h-12 items-center justify-center'>
                        <CollapseButton
                            collapsed={panel.isCollapsed()}
                            onClick={panel.toggle}
                        />
                    </div>
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
                            <TaskInfo task={props.task} />
                            <Line />
                            <TaskConfig task={props.task} />
                            <Line />
                            <TaskLora />
                        </PanelContent>
                    </div>
                )
            )}
        </Panel>
    )
}
