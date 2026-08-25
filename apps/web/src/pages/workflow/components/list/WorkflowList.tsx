import { Plus } from 'lucide-solid'
import { For, Show } from 'solid-js'

import { Button } from '#/components/base/Button'
import { Line } from '#/components/base/Line'
import { SectionTitle } from '#/components/base/SectionTitle'
import { cn } from '#/lib/cn'
import { useWorkflowStore } from '#/pages/workflow/store'

export function WorkflowList() {
    const store = useWorkflowStore()
    const active = () => store.state.records.filter(record => record.archivedAt === null)
    const archived = () => store.state.records.filter(record => record.archivedAt !== null)
    const draft = () => store.state.draft

    return (
        <aside class='flex w-[200px] flex-none flex-col overflow-hidden border-r border-line bg-surface'>
            <div class='flex h-12 flex-none items-center gap-2 pl-3 pr-2'>
                <h2 class='m-0 truncate text-[13px] font-semibold leading-none text-fg'>Workflows</h2>
                <div class='flex-1' />
                <Button
                    variant='ghost'
                    aria-label='New workflow'
                    classes={{ root: 'size-8 shrink-0 p-0' }}
                    onClick={() => store.startCreate()}
                >
                    <Plus
                        size={15}
                        strokeWidth={1.8}
                        aria-hidden='true'
                    />
                </Button>
            </div>

            <div class='scrollbar-thin flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto px-2 pb-3'>
                <For each={active()}>
                    {record => (
                        <Row
                            id={record.id}
                            name={record.name}
                            archived={false}
                        />
                    )}
                </For>

                <Show when={draft()?.isNew ? draft() : undefined}>
                    {value => (
                        <Row
                            id={value().id}
                            name={value().name || 'Untitled'}
                            archived={false}
                        />
                    )}
                </Show>

                <Show when={archived().length > 0}>
                    <Line />
                    <div class='px-2.5 py-1'>
                        <SectionTitle>Archived</SectionTitle>
                    </div>
                    <For each={archived()}>
                        {record => (
                            <Row
                                id={record.id}
                                name={record.name}
                                archived
                            />
                        )}
                    </For>
                </Show>
            </div>
        </aside>
    )
}

type RowProps = {
    id: string
    name: string
    archived: boolean
}

/*
 * 清單只負責選取。改名與刪除都在右欄，跟 Task 一樣。
 * 封存的列可以選取檢視，但唯讀，也沒有 Restore。
 */
function Row(props: RowProps) {
    const store = useWorkflowStore()
    const selected = () => store.state.selectedId === props.id

    return (
        <div
            class={cn(
                'flex h-[34px] shrink-0 cursor-pointer items-center rounded-md px-2.5',
                selected()
                    ? 'bg-active text-fg shadow-[inset_0_0_0_1px_rgba(255,255,255,0.06)]'
                    : 'text-fg-secondary hover:bg-elevated',
                props.archived && !selected() && 'text-fg-muted',
            )}
            onClick={() => store.selectWorkflow(props.id)}
        >
            <span class='min-w-0 flex-1 truncate text-xs leading-none'>{props.name}</span>
        </div>
    )
}
