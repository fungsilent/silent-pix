import { Plus } from 'lucide-solid'
import { For, Show } from 'solid-js'

import { Badge } from '#/components/base/Badge'
import { Button } from '#/components/base/Button'
import { Line } from '#/components/base/Line'
import { PanelHeader } from '#/components/base/Panel'
import { DetailTitle } from '#/components/detail'
import { cn } from '#/lib/cn'
import { toErrorMessage } from '#/lib/error'
import { useWorkflowStore } from '#/pages/workflow/store'

import type { JSX } from 'solid-js'

export function WorkflowList() {
    const store = useWorkflowStore()
    const listQuery = store.listQuery
    const active = () => store.summaries().filter(item => item.archivedAt === null)
    const archived = () => store.summaries().filter(item => item.archivedAt !== null)
    const draftId = () => store.state.createDraftId
    const draftName = store.form.useSelector(state => state.values.name)

    return (
        <aside class='flex w-[200px] flex-none flex-col overflow-hidden border-r border-line bg-surface'>
            <PanelHeader
                title='Workflows'
                classes={{ root: 'pl-3 pr-2' }}
                action={(
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
                )}
            />

            <div class='scrollbar-thin flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto px-2 pb-3'>
                <Show when={listQuery.isPending}>
                    <Notice>Loading…</Notice>
                </Show>

                <Show when={listQuery.isError}>
                    <Notice>{toErrorMessage(listQuery.error)}</Notice>
                </Show>

                <Show when={listQuery.isSuccess && store.summaries().length === 0 && !draftId()}>
                    <Notice>No workflows yet. Use + to add one.</Notice>
                </Show>

                <For each={active()}>
                    {item => (
                        <Row
                            id={item.id}
                            name={item.name}
                            archived={false}
                        />
                    )}
                </For>

                <Show when={draftId()}>
                    {value => (
                        <Row
                            id={value()}
                            name={draftName() || 'Untitled'}
                            archived={false}
                        />
                    )}
                </Show>

                <Show when={archived().length > 0}>
                    <Line />
                    <div class='px-2.5 py-1'>
                        <DetailTitle>Archived</DetailTitle>
                    </div>
                    <For each={archived()}>
                        {item => (
                            <Row
                                id={item.id}
                                name={item.name}
                                archived
                            />
                        )}
                    </For>
                </Show>
            </div>
        </aside>
    )
}

function Notice(props: { children: JSX.Element }) {
    return (
        <p class='px-2.5 py-2 text-xs leading-relaxed text-fg-muted'>
            {props.children}
        </p>
    )
}

type RowProps = {
    id: string
    name: string
    archived: boolean
}

function Row(props: RowProps) {
    const store = useWorkflowStore()
    const selected = () => store.state.selectedId === props.id || store.state.createDraftId === props.id
    const label = () => store.state.createDraftId === props.id || store.state.selectedId === props.id
        ? store.draftLabel()
        : null
    const select = () => {
        if (store.state.createDraftId === props.id) {
            return
        }

        store.selectWorkflow(props.id)
    }

    return (
        <div
            class={cn(
                'flex h-[34px] shrink-0 cursor-pointer items-center gap-2 rounded-md px-2.5',
                selected()
                    ? 'bg-active text-fg shadow-[inset_0_0_0_1px_rgba(255,255,255,0.06)]'
                    : 'text-fg-secondary hover:bg-elevated',
                props.archived && !selected() && 'text-fg-muted',
            )}
            onClick={select}
        >
            <span class='min-w-0 flex-1 truncate text-xs leading-none'>{props.name}</span>

            <Show when={label()}>
                {value => <Badge tone='accent'>{value()}</Badge>}
            </Show>
        </div>
    )
}
