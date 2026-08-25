import { Show } from 'solid-js'

import { Editable } from '#/components/field'
import { WorkflowDelete } from '#/pages/workflow/components/config/WorkflowDelete'
import { useWorkflowStore } from '#/pages/workflow/store'

import type { JSX } from 'solid-js'

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
        <section class='flex flex-col gap-2'>
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
        </section>
    )
}

type DetailRowProps = {
    children: JSX.Element
    label: string
}

function DetailRow(props: DetailRowProps) {
    return (
        <div class='grid min-w-0 grid-cols-[74px_minmax(0,1fr)] items-center gap-3'>
            <span class='text-xs leading-none text-fg-muted'>{props.label}</span>
            <div class='min-w-0'>{props.children}</div>
        </div>
    )
}
