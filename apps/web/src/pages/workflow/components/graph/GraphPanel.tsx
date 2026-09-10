import { Show } from 'solid-js'

import { Bar } from '#/components/base/Bar'
import { GraphEditor } from '#/pages/workflow/components/graph/GraphEditor'
import { useWorkflowStore } from '#/pages/workflow/store'

/* 中欄，對應 PromptPanel：面板自己擁有標題列與欄位標籤 */
export function GraphPanel() {
    const store = useWorkflowStore()
    const form = store.form
    const graphText = form.useSelector(state => state.values.graphText)

    return (
        <section class='flex min-w-0 flex-1 flex-col overflow-hidden border-r border-line bg-surface'>
            <Bar.Root>
                <Bar.Group>
                    <Bar.Title>API JSON</Bar.Title>
                </Bar.Group>
            </Bar.Root>

            <div class='flex min-h-0 flex-1 flex-col px-4 pb-3'>
                <span class='pb-1.5 text-xs leading-none text-fg-muted'>Graph</span>
                <Show
                    when={store.hasSelection()}
                    fallback={(
                        <div class='flex min-h-0 flex-1 items-center justify-center overflow-hidden rounded-md border border-transparent bg-elevated px-8 text-center text-xs leading-relaxed text-fg-muted'>
                            Add a workflow to paste its API JSON.
                        </div>
                    )}
                >
                    <form.Field name='graphText'>
                        {field => (
                            <GraphEditor
                                value={graphText()}
                                loading={store.isDetailLoading()}
                                marks={store.graphState().lineMarks}
                                readOnly={store.isRemoteUnavailable() || store.selection().isArchived}
                                onChange={field().handleChange}
                            />
                        )}
                    </form.Field>
                </Show>
            </div>
        </section>
    )
}
