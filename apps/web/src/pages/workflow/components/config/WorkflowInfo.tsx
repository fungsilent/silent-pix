import { Show } from 'solid-js'

import { DetailRow, DetailSection } from '#/components/detail'
import { Editable } from '#/components/field'
import { WorkflowDelete } from '#/pages/workflow/components/config/WorkflowDelete'
import { useWorkflowStore } from '#/pages/workflow/store'


/* 對應 TaskInfo：identity 與破壞性動作放在右欄最上面，沒有自己的標題 */
export function WorkflowInfo() {
    const store = useWorkflowStore()
    const rename = (value: string) => {
        const id = store.selection().id

        if (id) {
            store.commitName(id, value)
        }
    }

    return (
        <DetailSection>
            <DetailRow label='Name'>
                <Editable
                    disabled={store.selection().isArchived}
                    label='Workflow name'
                    placeholder='Untitled'
                    value={store.selection().name}
                    onCommit={rename}
                    classes={{ root: 'w-full' }}
                />
            </DetailRow>

            <Show when={!store.selection().isArchived}>
                <WorkflowDelete />
            </Show>
        </DetailSection>
    )
}
