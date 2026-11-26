import { Show } from 'solid-js'

import { Badge } from '#/components/base/Badge'
import { Loading } from '#/components/base/Loading'
import { DetailRow, DetailSection } from '#/components/detail'
import { Editable } from '#/components/field'
import { t } from '#/lib/i18n'
import { WorkflowDelete } from '#/pages/workflow/components/config/WorkflowDelete'
import { useWorkflowStore } from '#/pages/workflow/state/store'

/* 對應 TaskInfo：identity 與破壞性動作放在右欄最上面，沒有自己的標題 */
export function WorkflowInfo() {
    const page = useWorkflowStore()
    const form = page.form
    const name = form.useSelector(state => state.values.name)
    const isLoading = page.isDetailLoading
    /* 還沒存過的那一筆沒有 revision 可言 */
    const revision = () => page.selection().revision > 0
        ? `${page.selection().revision}`
        : '—'

    return (
        <DetailSection inert={isLoading()}>
            <DetailRow label={t('fields.name')}>
                <form.Field name='name'>
                    {field => (
                        <Loading.Mask loading={isLoading}>
                            <Editable
                                disabled={page.isReadOnly()}
                                label={t('workflow.nameLabel')}
                                placeholder={t('common.untitled')}
                                value={name()}
                                onChange={field().handleChange}
                                onCommit={value => field().handleChange(value.trim().slice(0, 120))}
                                classes={{ root: 'w-full' }}
                            />
                        </Loading.Mask>
                    )}
                </form.Field>
            </DetailRow>

            <DetailRow label={t('fields.revision')}>
                <Loading.Mask loading={isLoading}>
                    <div class='flex h-5 min-w-0 items-center gap-2'>
                        <span
                            class='text-xs leading-none'
                            classList={{
                                'text-fg-secondary': page.selection().revision > 0,
                                'text-fg-muted': page.selection().revision === 0,
                            }}
                        >
                            {revision()}
                        </span>

                        <Show when={page.draftLabel()}>
                            {value => <Badge tone='neutral'>{value()}</Badge>}
                        </Show>
                    </div>
                </Loading.Mask>
            </DetailRow>

            <Show when={!page.selection().isNew && !page.isDeleted()}>
                <Loading.Mask loading={isLoading}>
                    <WorkflowDelete />
                </Loading.Mask>
            </Show>
        </DetailSection>
    )
}
