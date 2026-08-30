import { Show } from 'solid-js'

import { Badge } from '#/components/base/Badge'
import { Loading } from '#/components/base/Loading'
import { DetailRow, DetailSection } from '#/components/detail'
import { Editable } from '#/components/field'
import { WorkflowDelete } from '#/pages/workflow/components/config/WorkflowDelete'
import { useWorkflowStore } from '#/pages/workflow/store'

/* 對應 TaskInfo：identity 與破壞性動作放在右欄最上面，沒有自己的標題 */
export function WorkflowInfo() {
    const store = useWorkflowStore()
    const form = store.form
    const name = form.useSelector(state => state.values.name)
    const isLoading = store.isDetailLoading
    /* 還沒存過的那一筆沒有 revision 可言 */
    const revision = () => store.selection().revision > 0
        ? `${store.selection().revision}`
        : '—'

    return (
        <DetailSection inert={isLoading()}>
            <DetailRow label='Name'>
                <form.Field name='name'>
                    {field => (
                        <Loading.Mask loading={isLoading}>
                            <Editable
                                disabled={store.isRemoteUnavailable() || store.selection().isArchived}
                                label='Workflow name'
                                placeholder='Untitled'
                                value={name()}
                                onChange={field().handleChange}
                                onCommit={value => field().handleChange(value.trim().slice(0, 120))}
                                classes={{ root: 'w-full' }}
                            />
                        </Loading.Mask>
                    )}
                </form.Field>
            </DetailRow>

            <DetailRow label='Revision'>
                <Loading.Mask loading={isLoading}>
                    <div class='flex h-5 min-w-0 items-center gap-2'>
                        <span
                            class='text-xs leading-none'
                            classList={{
                                'text-fg-secondary': store.selection().revision > 0,
                                'text-fg-muted': store.selection().revision === 0,
                            }}
                        >
                            {revision()}
                        </span>

                        <Show when={store.draftLabel()}>
                            {value => <Badge class='bg-slate-500/15 text-slate-300'>{value()}</Badge>}
                        </Show>
                    </div>
                </Loading.Mask>
            </DetailRow>

            <Show when={!store.selection().isNew}>
                <Loading.Mask loading={isLoading}>
                    <WorkflowDelete />
                </Loading.Mask>
            </Show>
        </DetailSection>
    )
}
