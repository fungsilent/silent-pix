import { Show } from 'solid-js'

import { Badge } from '#/components/base/Badge'
import { DetailRow, DetailSection } from '#/components/detail'
import { Editable } from '#/components/field'
import { WorkflowDelete } from '#/pages/workflow/components/config/WorkflowDelete'
import { useWorkflowStore } from '#/pages/workflow/store'

/* 對應 TaskInfo：identity 與破壞性動作放在右欄最上面，沒有自己的標題 */
export function WorkflowInfo() {
    const store = useWorkflowStore()
    /* 還沒存過的那一筆沒有 revision 可言 */
    const revision = () => store.selection().revision > 0
        ? `${store.selection().revision}`
        : '—'

    return (
        <DetailSection>
            <DetailRow label='Name'>
                <Editable
                    disabled={store.selection().isArchived}
                    label='Workflow name'
                    placeholder='Untitled'
                    value={store.selection().name}
                    onChange={value => store.setName(value)}
                    onCommit={value => store.commitName(value)}
                    classes={{ root: 'w-full' }}
                />
            </DetailRow>

            <DetailRow label='Revision'>
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
                        {value => <Badge tone='accent'>{value()}</Badge>}
                    </Show>
                </div>
            </DetailRow>

            <Show when={!store.selection().isArchived}>
                <WorkflowDelete />
            </Show>
        </DetailSection>
    )
}
