import { PanelHeader } from '#/components/base/Panel'
import { GraphEditor } from '#/pages/workflow/components/graph/GraphEditor'
import { useWorkflowStore } from '#/pages/workflow/store'

/* 中欄，對應 PromptPanel：面板自己擁有標題列與欄位標籤 */
export function GraphPanel() {
    const store = useWorkflowStore()
    const form = store.form
    const graphText = form.useSelector(state => state.values.graphText)

    return (
        <section class='flex min-w-0 flex-1 flex-col overflow-hidden border-r border-line bg-surface'>
            <PanelHeader
                title='API JSON'
                classes={{ root: 'px-4' }}
            />

            <div class='flex min-h-0 flex-1 flex-col px-4 pb-3'>
                <span class='pb-1.5 text-xs leading-none text-fg-muted'>Graph</span>
                <form.Field name='graphText'>
                    {field => (
                        <GraphEditor
                            value={graphText()}
                            marks={store.graphState().lineMarks}
                            readOnly={store.isLoading() || store.selection().isArchived}
                            onChange={field().handleChange}
                        />
                    )}
                </form.Field>
            </div>
        </section>
    )
}
