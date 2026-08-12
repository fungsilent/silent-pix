import { TagsInput as ArkTagsInput } from '@ark-ui/solid/tags-input'
import { clsx } from 'clsx'
import { GripVertical, X } from 'lucide-solid'
import { For } from 'solid-js'

export type TagItemData = {
    id: string
    label: string
}

type TagProps = {
    draggedId?: string | undefined
    items: TagItemData[]
    placeholder?: string
    selectedId?: string | undefined
    onDragEnd?: () => void
    onDragStart?: (itemId: string) => void
    onDrop?: (itemId: string) => void
    onSelect?: (itemId: string) => void
    onValuesChange: (values: string[]) => void
    classes?: {
        root?: string
        control?: string
        input?: string
        item?: string
        itemActive?: string
        itemIdle?: string
    }
}

export function Tag(props: TagProps) {
    return (
        <ArkTagsInput.Root
            class={clsx('min-w-0', props.classes?.root)}
            value={props.items.map(item => item.label)}
            onValueChange={details => props.onValuesChange(details.value)}
        >
            <ArkTagsInput.Control class={clsx('flex min-w-0 flex-wrap items-center gap-2', props.classes?.control)}>
                <For each={props.items}>
                    {item => (
                        <ArkTagsInput.Item
                            class={clsx(
                                'inline-flex h-6 cursor-pointer items-center gap-1 rounded-md border px-2 text-[0.72rem] leading-none',
                                item.id === props.selectedId
                                    ? props.classes?.itemActive ?? 'border-accent bg-accent/20 text-accent-fg'
                                    : props.classes?.itemIdle ?? 'border-line bg-elevated text-fg-secondary',
                                item.id === props.draggedId && 'opacity-50',
                                props.classes?.item,
                            )}
                            draggable={Boolean(props.onDragStart)}
                            index={props.items.findIndex(candidate => candidate.id === item.id)}
                            value={item.label}
                            onClick={() => props.onSelect?.(item.id)}
                            onDragEnd={props.onDragEnd}
                            onDragOver={event => event.preventDefault()}
                            onDragStart={event => {
                                event.dataTransfer?.setData('text/plain', item.id)
                                props.onDragStart?.(item.id)
                            }}
                            onDrop={event => {
                                event.preventDefault()
                                props.onDrop?.(item.id)
                            }}
                        >
                            <GripVertical
                                size={12}
                                strokeWidth={2}
                            />
                            <ArkTagsInput.ItemPreview class='flex min-w-0 items-center gap-1'>
                                <ArkTagsInput.ItemText class='min-w-0 truncate'>{item.label}</ArkTagsInput.ItemText>
                                <ArkTagsInput.ItemDeleteTrigger
                                    class='inline-flex h-4 w-4 items-center justify-center rounded text-fg-muted hover:text-fg'
                                >
                                    <X
                                        size={12}
                                        strokeWidth={2.2}
                                        class='text-red-400 cursor-pointer'
                                    />
                                </ArkTagsInput.ItemDeleteTrigger>
                            </ArkTagsInput.ItemPreview>
                            <ArkTagsInput.ItemInput class='h-5 min-w-16 rounded border border-accent/60 bg-active px-1 text-xs text-fg outline-none' />
                        </ArkTagsInput.Item>
                    )}
                </For>
                <ArkTagsInput.Input
                    class={clsx('h-6 min-w-20 flex-1 bg-transparent text-xs text-fg outline-none placeholder:text-fg-muted', props.classes?.input)}
                    placeholder={props.placeholder ?? 'Tag'}
                />
                <ArkTagsInput.HiddenInput />
            </ArkTagsInput.Control>
        </ArkTagsInput.Root>
    )
}
