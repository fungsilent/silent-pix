import { createMemo, Show } from 'solid-js'

import { CollapseButton, Panel, PanelContent, PanelHeader } from '#/components/base/Panel'
import { useTaskDetailQuery } from '#/features/task/task.query'
import { TaskDetail } from '#/pages/generate/components/config/TaskDetail'
import { InputImageDetail } from '#/pages/generate/components/workspace/compare/InputImageDetail'
import { createGenerateStore, GenerateStoreProvider } from '#/pages/generate/store'
import { workspaceStore } from '#/store/workspace'

export function CompareDetail() {
    const selected = createMemo(() => workspaceStore.selectedCompare())
    const taskId = createMemo(() => {
        const origin = selected()?.origin
        return origin?.type === 'output' ? origin.taskId : undefined
    })
    const taskDetailQuery = useTaskDetailQuery(taskId)
    const taskDetail = createMemo(() => {
        const task = taskDetailQuery.data
        if (!task || task.id !== taskId()) {
            return undefined
        }

        return {
            store: createGenerateStore(task),
            task,
        }
    })

    return (
        <Show
            when={selected()}
            fallback={<DetailStatus />}
        >
            {entry => (
                <Show
                    when={entry().origin?.type === 'output'}
                    fallback={<InputImageDetail image={entry().image} />}
                >
                    <Show
                        when={taskDetail()}
                        fallback={(
                            <DetailStatus
                                message={taskDetailQuery.isError
                                    ? 'Failed to load task detail.'
                                    : 'Loading task detail...'}
                            />
                        )}
                    >
                        {detail => (
                            <GenerateStoreProvider store={detail().store}>
                                <TaskDetail
                                    mode='view'
                                    task={detail().task}
                                />
                            </GenerateStoreProvider>
                        )}
                    </Show>
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
