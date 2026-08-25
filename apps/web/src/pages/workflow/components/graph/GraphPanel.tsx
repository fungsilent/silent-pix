import { GraphEditor } from '#/pages/workflow/components/graph/GraphEditor'
import { useWorkflowStore } from '#/pages/workflow/store'

/* 中欄，對應 PromptPanel：面板自己擁有標題列與欄位標籤 */
export function GraphPanel() {
    const store = useWorkflowStore()

    return (
        <section class='flex min-w-0 flex-1 flex-col overflow-hidden border-r border-line bg-surface'>
            <div class='flex h-12 flex-none items-center gap-2 px-4'>
                <h2 class='m-0 text-[13px] font-semibold leading-none text-fg'>API JSON</h2>
            </div>

            <div class='flex min-h-0 flex-1 flex-col px-4 pb-3'>
                <span class='pb-1.5 text-xs leading-none text-fg-muted'>Graph</span>
                <GraphEditor
                    value={store.selection().graphText}
                    marks={store.graphState().lineMarks}
                    readOnly={store.selection().isArchived}
                    onChange={value => store.setGraphText(value)}
                />
            </div>
        </section>
    )
}
