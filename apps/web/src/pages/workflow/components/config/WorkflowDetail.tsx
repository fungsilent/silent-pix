import { Save, Workflow } from 'lucide-solid'
import { createMemo, createSignal, Show } from 'solid-js'

import { ApiError } from '#/api/api.client'
import { Bar } from '#/components/base/Bar'
import { Button } from '#/components/base/Button'
import { IssueChip } from '#/components/base/IssueChip'
import { Line } from '#/components/base/Line'
import { WorkflowInfo } from '#/pages/workflow/components/config/WorkflowInfo'
import { WorkflowMapping } from '#/pages/workflow/components/config/WorkflowMapping'
import {
    toGraphIssues,
    toListIssues,
    toLoadIssues,
    toMappingIssues,
    toRequirementIssues,
    toSaveIssues,
} from '#/pages/workflow/issue'
import { useWorkflowStore } from '#/pages/workflow/store'

/*
 * 右欄，對應 TaskDetail：面板自己擁有標題列，頁面只負責排三欄。
 * mapping 只是底下的一段，所以這一欄叫 Detail 不叫 Mapping。
 */
export function WorkflowDetail() {
    const store = useWorkflowStore()
    const [issuesOpen, setIssuesOpen] = createSignal(false)
    const detailQuery = store.detailQuery

    const issues = createMemo(() => [
        ...store.state.validationIssues,
        ...toListIssues({
            error: store.listQuery.isError ? store.listQuery.error : null,
            onRetry: store.refreshWorkflowList,
        }),
        ...toLoadIssues(detailQuery.isError ? detailQuery.error : null),
        ...toRequirementIssues({
            isDirty: store.isModified(),
            name: store.selection().name,
            parse: store.graphState().parse,
        }),
        ...toGraphIssues(store.graphState().parse),
        ...toMappingIssues(store.graphState().mappingIssues),
        ...toSaveIssues({
            conflict: store.isConflict(),
            error: store.selection().isNew
                ? store.createMutation.error
                : store.updateMutation.error,
        }),
    ])

    const isSaving = store.isSubmitting

    const canSave = () => {
        const selection = store.selection()

        return store.isModified()
            /* 沒有目標就不可能存——空狀態之後走不到，守衛仍該在 */
            && selection.id !== null
            && !selection.isArchived
            && !isSaving()
            /* 載入中畫面全被遮住，使用者看不到自己會存下什麼 */
            && !store.isDetailLoading()
            && !store.isConflict()
            && selection.name.trim().length > 0
            && store.graphState().graph !== undefined
            && store.graphState().mappingIssues.length === 0
    }

    const handleSubmit = async (event: SubmitEvent) => {
        event.preventDefault()

        if (isSaving() || store.isDetailLoading()) {
            return
        }

        store.clearValidationIssues()

        try {
            await store.form.handleSubmit()
        }
        catch (error) {
            if (error instanceof ApiError && error.code === 'WORKFLOW_NOT_FOUND') {
                store.refreshWorkflowList()
            }
        }
    }

    return (
        <form
            class='flex w-[620px] flex-none flex-col overflow-hidden bg-surface'
            onSubmit={event => void handleSubmit(event)}
        >
            <Bar.Root>
                <Bar.Group>
                    <Bar.Title>Detail</Bar.Title>
                </Bar.Group>
                <Show when={store.hasSelection()}>
                    <Bar.Actions classes={{ root: 'flex-1 justify-end' }}>
                        <IssueChip
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
                                size='bar'
                                variant='solid'
                                tone='accent'
                                type='submit'
                                disabled={!canSave()}
                                classes={{ root: 'shrink-0 font-semibold disabled:cursor-not-allowed disabled:opacity-60' }}
                            >
                                <Save
                                    size={13}
                                    strokeWidth={1.7}
                                />
                                {isSaving() ? 'Saving' : 'Save'}
                            </Button>
                        </Show>
                    </Bar.Actions>
                </Show>
            </Bar.Root>

            <Show
                when={store.hasSelection()}
                fallback={(
                    <div class='flex min-h-0 flex-1 items-center justify-center px-4 pb-5'>
                        <div class='flex max-w-[280px] flex-col items-center gap-3 text-center'>
                            <div class='grid size-12 place-items-center rounded-xl border border-line-subtle bg-elevated text-fg-muted'>
                                <Workflow
                                    size={21}
                                    strokeWidth={1.5}
                                />
                            </div>
                            <div class='flex flex-col gap-1'>
                                <h3 class='m-0 text-sm font-medium text-fg'>No workflow selected</h3>
                                <p class='m-0 text-xs leading-relaxed text-fg-muted'>
                                    A workflow holds the ComfyUI graph and the field mapping the generate page uses.
                                </p>
                            </div>
                            <Button
                                variant='solid'
                                tone='accent'
                                classes={{ root: 'mt-1 h-8 px-3 text-xs' }}
                                onClick={() => store.startCreate()}
                            >
                                <Workflow
                                    size={14}
                                    strokeWidth={1.8}
                                />
                                Add workflow
                            </Button>
                        </div>
                    </div>
                )}
            >
                <div class='scrollbar-thin flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-4 pb-5'>
                    <div
                        class='contents'
                        inert={store.isDetailLoading()}
                    >
                        <WorkflowInfo />
                        <Line />
                        <WorkflowMapping />
                    </div>
                </div>
            </Show>
        </form>
    )
}
