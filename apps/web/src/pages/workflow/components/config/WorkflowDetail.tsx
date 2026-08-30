import { Plus, Save } from 'lucide-solid'
import { createMemo, createSignal, Show } from 'solid-js'

import { ApiError } from '#/api/api.client'
import { Button } from '#/components/base/Button'
import { IssueChip } from '#/components/base/IssueChip'
import { Line } from '#/components/base/Line'
import { PanelHeader } from '#/components/base/Panel'
import { WorkflowInfo } from '#/pages/workflow/components/config/WorkflowInfo'
import { WorkflowMapping } from '#/pages/workflow/components/config/WorkflowMapping'
import {
    toGraphIssues,
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
            <PanelHeader
                title='Detail'
                classes={{ root: 'px-4' }}
                action={(
                    <Show when={store.hasSelection()}>
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
                                    type='submit'
                                    disabled={!canSave()}
                                    classes={{ root: 'shrink-0 px-3.5 disabled:cursor-not-allowed disabled:opacity-60' }}
                                >
                                    <Save
                                        size={13}
                                        strokeWidth={1.7}
                                        aria-hidden='true'
                                    />
                                    {isSaving() ? 'Saving' : 'Save'}
                                </Button>
                            </Show>
                        </div>
                    </Show>
                )}
            />

            <Show
                when={store.hasSelection()}
                fallback={(
                    <div class='flex min-h-0 flex-1 flex-col items-center justify-center gap-4 px-4 pb-5 text-center'>
                        <p class='m-0 text-[13px] leading-relaxed text-fg-secondary'>No workflow selected</p>
                        <p class='m-0 max-w-80 text-xs leading-relaxed text-fg-muted'>
                            A workflow holds the ComfyUI graph and the field mapping the generate page uses.
                        </p>
                        <Button
                            variant='accent'
                            onClick={() => store.startCreate()}
                        >
                            <Plus
                                size={13}
                                strokeWidth={1.8}
                                aria-hidden='true'
                            />
                            New workflow
                        </Button>
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
