import { Show } from 'solid-js'

import { Bar } from '#/components/base/Bar'
import { t } from '#/lib/i18n'
import { theme } from '#/lib/theme'
import { GraphEditor } from '#/pages/workflow/components/graph/GraphEditor'
import { useWorkflowStore } from '#/pages/workflow/state/store'
import { mergeClasses } from '#/utils/style'

export function GraphPanel() {
    const page = useWorkflowStore()
    const form = page.form
    const graphText = form.useSelector(state => state.values.graphText)

    return (
        <section class={mergeClasses(theme.card, 'flex min-w-0 flex-1 flex-col bg-surface')}>
            <Bar.Root>
                <Bar.Group>
                    <Bar.Title>{t('workflow.apiJson')}</Bar.Title>
                </Bar.Group>
            </Bar.Root>

            <div class='flex min-h-0 flex-1 flex-col px-4 pb-3'>
                <Show when={page.hasSelection() || page.isDetailLoading()}>
                    <form.Field name='graphText'>
                        {field => (
                            <GraphEditor
                                value={graphText()}
                                loading={page.isDetailLoading()}
                                marks={page.graphState().lineMarks}
                                readOnly={page.isReadOnly()}
                                onChange={field().handleChange}
                            />
                        )}
                    </form.Field>
                </Show>
            </div>
        </section>
    )
}
