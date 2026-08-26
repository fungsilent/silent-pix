import { Save } from 'lucide-solid'
import { createMemo, createSignal, Show } from 'solid-js'

import { Button } from '#/components/base/Button'
import { IssueChip } from '#/components/base/IssueChip'
import { Line } from '#/components/base/Line'
import { PanelHeader } from '#/components/base/Panel'
import { WorkflowInfo } from '#/pages/workflow/components/config/WorkflowInfo'
import { WorkflowMapping } from '#/pages/workflow/components/config/WorkflowMapping'
import { toGraphIssues, toMappingIssues } from '#/pages/workflow/issue'
import { useWorkflowStore } from '#/pages/workflow/store'

/*
 * 右欄，對應 TaskDetail：面板自己擁有標題列，頁面只負責排三欄。
 * mapping 只是底下的一段，所以這一欄叫 Detail 不叫 Mapping。
 */
export function WorkflowDetail() {
    const store = useWorkflowStore()
    const [issuesOpen, setIssuesOpen] = createSignal(false)

    const issues = createMemo(() => [
        ...toGraphIssues(store.graphState().parse),
        ...toMappingIssues(store.graphState().mappingIssues),
    ])

    /* PHASE 3 是 client-only：Save 一律停用 */
    const canSave = () => false

    return (
        <section class='flex w-[620px] flex-none flex-col overflow-hidden bg-surface'>
            <PanelHeader
                title='Detail'
                classes={{ root: 'px-4' }}
                action={(
                    <div class='flex min-w-0 flex-1 items-center justify-end gap-2'>
                        <IssueChip
                            label='workflow'
                            issues={issues()}
                            open={issuesOpen()}
                            onOpenChange={setIssuesOpen}
                        />

                        <Show
                            when={!store.selection().isArchived}
                            fallback={
                                <span class='shrink-0 text-[11.5px] leading-none text-fg-muted'>
                                    Read-only · archived
                                </span>
                            }
                        >
                            <Button
                                variant='primary'
                                disabled={!canSave()}
                                classes={{ root: 'shrink-0 px-3.5 disabled:cursor-not-allowed disabled:opacity-60' }}
                            >
                                <Save
                                    size={13}
                                    strokeWidth={1.7}
                                    aria-hidden='true'
                                />
                                Save
                            </Button>
                        </Show>
                    </div>
                )}
            />

            <div class='scrollbar-thin flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-4 pb-5'>
                <WorkflowInfo />
                <Line />
                <WorkflowMapping />
            </div>
        </section>
    )
}
