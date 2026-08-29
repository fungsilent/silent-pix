import { createEffect, createMemo, on } from 'solid-js'
import { Show } from 'solid-js'

import { CollapseButton, CollapsedBar, Panel, PanelContent, PanelHeader } from '#/components/base/Panel'
import { useTaskDetailQuery } from '#/features/task/task.query'
import { TaskDetail } from '#/pages/generate/components/config/TaskDetail'
import { ReferenceImageDetail } from '#/pages/generate/components/workspace/compare/ReferenceImageDetail'
import { createGenerateDetail, GenerateDetailProvider } from '#/pages/generate/detail'
import { draftTask, toGenerateValues } from '#/pages/generate/form'
import { createGenerateStore, GenerateStoreProvider } from '#/pages/generate/store'
import { workspaceStore } from '#/store/workspace'

export function CompareDetail() {
    const selected = createMemo(() => workspaceStore.selectedCompare())
    const taskId = createMemo(() => {
        const origin = selected()?.origin
        return origin?.type === 'output' ? origin.taskId : undefined
    })
    const taskDetailQuery = useTaskDetailQuery(taskId)
    const detailStore = createGenerateStore(draftTask)
    const acceptedTask = createMemo(() => {
        const task = taskDetailQuery.data

        if (!task || task.id !== taskId()) {
            return undefined
        }

        return task
    })
    /* compare 的 origin task 是另一個 query，在這裡覆蓋掉外層 GeneratePage 的 detail */
    const detail = createGenerateDetail({
        error: () => taskDetailQuery.isError && acceptedTask() === undefined,
        loading: () => taskId() !== undefined && taskDetailQuery.isLoading,
        task: acceptedTask,
    })

    createEffect(on(
        () => detail.task(),
        task => {
            if (task) {
                /* Compare 是唯讀檢視，同一 task 的 accepted query record 也要更新。 */
                detailStore.form.reset(toGenerateValues(task))
            }
        },
    ))

    return (
        <GenerateStoreProvider store={detailStore}>
            <GenerateDetailProvider value={detail}>
                <Show
                    when={selected()}
                    fallback={<DetailStatus />}
                >
                    {entry => (
                        <Show
                            when={entry().origin?.type === 'output'}
                            fallback={<ReferenceImageDetail image={entry().image} />}
                        >
                            <TaskDetail mode='view' />
                        </Show>
                    )}
                </Show>
            </GenerateDetailProvider>
        </GenerateStoreProvider>
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
