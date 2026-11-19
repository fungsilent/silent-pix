import { Save, Workflow } from 'lucide-solid'
import { createMemo, onCleanup, Show } from 'solid-js'

import { Bar } from '#/components/base/Bar'
import { Button } from '#/components/base/Button'
import { Line } from '#/components/base/Line'
import { StatusMessage } from '#/components/base/StatusMessage'
import { t } from '#/lib/i18n'
import { issueList, useIssueSource } from '#/lib/issue'
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
    const page = useWorkflowStore()
    const detailQuery = page.detailQuery

    const issues = createMemo(() => [
        ...page.state.validationIssues,
        /* 沒有資料的讀取失敗由內容區的 StatusMessage 顯示；這裡只剩背景重新整理失敗 */
        ...toLoadIssues(detailQuery.isError && detailQuery.data ? detailQuery.error : null),
        ...toRequirementIssues({
            isDirty: page.isModified(),
            name: page.selection().name,
            parse: page.graphState().parse,
        }),
        ...toGraphIssues(page.graphState().parse),
        ...toMappingIssues(page.graphState().mappingIssues),
        ...toSaveIssues({
            conflict: page.isConflict(),
            error: page.state.saveError,
            onDismiss: page.dismissSaveError,
        }),
    ])

    const isSaving = page.isSubmitting
    const readOnlyLabel = () => {
        if (page.isDeleted()) return t('workflow.readOnlyDeleted')
        if (page.selection().isArchived) return t('workflow.readOnlyArchived')
    }
    const loadFailed = () => page.hasSelection() && !page.isDeleted() && detailQuery.isError && !detailQuery.data
    /* 沒有選取或整個讀取失敗時，畫面上沒有可存的東西，問題也不列 */
    useIssueSource(() => page.hasSelection() && !page.isDeleted() && !loadFailed() ? issues() : [])

    let disposed = false
    onCleanup(() => { disposed = true })

    const handleSubmit = async (event: SubmitEvent) => {
        event.preventDefault()

        const submission = page.submit()
        if (!submission) return

        const stillEditing = await submission
        if (!disposed && stillEditing && issues().length > 0) issueList.setOpen(true)
    }

    return (
        <form
            class='flex w-[620px] flex-none flex-col overflow-hidden bg-surface'
            onSubmit={event => void handleSubmit(event)}
        >
            <Bar.Root>
                <Bar.Group>
                    <Bar.Title>{t('common.detail')}</Bar.Title>
                </Bar.Group>
                <Show when={page.hasSelection() && !loadFailed()}>
                    <Bar.Actions classes={{ root: 'flex-1 justify-end' }}>
                        <Show
                            when={!readOnlyLabel()}
                            fallback={
                                <span class='shrink-0 text-[11.5px] leading-none text-fg-muted'>
                                    {readOnlyLabel()}
                                </span>
                            }
                        >
                            <Button
                                size='bar'
                                variant='solid'
                                tone='accent'
                                type='submit'
                                disabled={!page.canSave()}
                                classes={{ root: 'shrink-0 font-semibold' }}
                            >
                                <Save
                                    size={13}
                                    strokeWidth={1.7}
                                />
                                {isSaving() ? t('workflow.saving') : t('common.save')}
                            </Button>
                        </Show>
                    </Bar.Actions>
                </Show>
            </Bar.Root>

            <Show
                when={page.hasSelection()}
                fallback={(
                    <div class='flex min-h-0 flex-1 items-center justify-center px-4 pb-5'>
                        <StatusMessage
                            kind='empty'
                            title={t('workflow.noSelection')}
                            message={t('workflow.description')}
                            icon={(
                                <Workflow
                                    size={21}
                                    strokeWidth={1.5}
                                />
                            )}
                            action={{
                                label: t('workflow.add'),
                                icon: (
                                    <Workflow
                                        size={14}
                                        strokeWidth={1.8}
                                    />
                                ),
                                onClick: () => page.startCreate(),
                            }}
                        />
                    </div>
                )}
            >
                <Show
                    when={!loadFailed()}
                    fallback={(
                        <div class='flex min-h-0 flex-1 items-center justify-center px-4 pb-5'>
                            <StatusMessage
                                kind='load-error'
                                message={t('workflow.loadFailed')}
                                onRetry={() => void detailQuery.refetch()}
                            />
                        </div>
                    )}
                >
                    <div class='scrollbar-thin flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-4 pb-5'>
                        <Show when={page.isDeleted()}>
                            <p class='m-0 text-xs leading-relaxed text-fg-secondary'>{t('workflow.deletedDraft')}</p>
                        </Show>
                        <div
                            class='contents'
                            inert={page.isDetailLoading()}
                        >
                            <WorkflowInfo />
                            <Line />
                            <WorkflowMapping />
                        </div>
                    </div>
                </Show>
            </Show>
        </form>
    )
}
