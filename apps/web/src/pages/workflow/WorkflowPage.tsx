import { Plus, Workflow } from 'lucide-solid'
import { Show } from 'solid-js'

import { StatusMessage } from '#/components/base/StatusMessage'
import { t } from '#/lib/i18n'
import { theme } from '#/lib/theme'
import { WorkflowDetail } from '#/pages/workflow/components/config/WorkflowDetail'
import { GraphPanel } from '#/pages/workflow/components/graph/GraphPanel'
import { WorkflowList } from '#/pages/workflow/components/list/WorkflowList'
import { useWorkflowStore, WorkflowStoreProvider } from '#/pages/workflow/state/store'
import { mergeClasses } from '#/utils/style'

export function WorkflowPage() {
    return (
        <WorkflowStoreProvider>
            <WorkflowWorkspace />
        </WorkflowStoreProvider>
    )
}

function WorkflowWorkspace() {
    const page = useWorkflowStore()

    return (
        <Show
            when={!page.showOpening()}
            fallback={<OpeningScreen />}
        >
            <div class='flex min-h-0 flex-1 overflow-x-auto overflow-y-hidden'>
                <div class='flex min-w-[1060px] flex-1 gap-1'>
                    <WorkflowList />
                    <GraphPanel />
                    <WorkflowDetail />
                </div>
            </div>
        </Show>
    )
}

function OpeningScreen() {
    const page = useWorkflowStore()

    return (
        <section class={mergeClasses(theme.card, 'flex min-w-0 flex-1 items-center justify-center bg-surface px-4')}>
            <Show
                when={page.listQuery.data}
                fallback={(
                    <StatusMessage
                        kind='load-error'
                        message={t('workflow.loadListFailed')}
                        onRetry={() => page.refreshWorkflowList()}
                        classes={{ root: 'max-w-[320px]' }}
                    />
                )}
            >
                <StatusMessage
                    kind='empty'
                    title={t('workflow.empty')}
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
                            <Plus
                                size={14}
                                strokeWidth={1.8}
                            />
                        ),
                        onClick: () => page.startCreate(),
                    }}
                    classes={{ root: 'max-w-[320px]' }}
                />
            </Show>
        </section>
    )
}
