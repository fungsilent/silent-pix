import { Save, Workflow } from 'lucide-solid'
import { createMemo, Show } from 'solid-js'

import { ApiError } from '#/api/api.client'
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
    const store = useWorkflowStore()
    const detailQuery = store.detailQuery

    const issues = createMemo(() => [
        ...store.state.validationIssues,
        /* 沒有資料的讀取失敗由內容區的 StatusMessage 顯示；這裡只剩背景重新整理失敗 */
        ...toLoadIssues(detailQuery.isError && detailQuery.data ? detailQuery.error : null),
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
            onDismiss: () => {
                store.createMutation.reset()
                store.updateMutation.reset()
            },
        }),
    ])

    const isSaving = store.isSubmitting
    const loadFailed = () => store.hasSelection() && detailQuery.isError && !detailQuery.data
    /* 沒有選取或整個讀取失敗時，畫面上沒有可存的東西，問題也不列 */
    useIssueSource(() => store.hasSelection() && !loadFailed() ? issues() : [])

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

        /* 按下 Save 被擋或失敗時展開 Header 的清單 */
        if (issues().length > 0) issueList.setOpen(true)
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
                <Show when={store.hasSelection() && !loadFailed()}>
                    <Bar.Actions classes={{ root: 'flex-1 justify-end' }}>
                        <Show
                            when={!store.selection().isArchived}
                            fallback={
                                <span class='shrink-0 text-[11.5px] leading-none text-fg-muted'>
                                    {t('workflow.readOnlyArchived')}
                                </span>
                            }
                        >
                            <Button
                                size='bar'
                                variant='solid'
                                tone='accent'
                                type='submit'
                                disabled={!canSave()}
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
                when={store.hasSelection()}
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
                                onClick: () => store.startCreate(),
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
            </Show>
        </form>
    )
}
