import { TagsInput as ArkTagsInput } from '@ark-ui/solid/tags-input'
import { GripVertical, X } from 'lucide-solid'
import { For } from 'solid-js'

import { cn } from '#/lib/cn'

export type PromptTabItem = {
    id: string
    label: string
}

type PromptTabsProps = {
    draggedId?: string | undefined
    items: PromptTabItem[]
    selectedId?: string | undefined
    onDragEnd?: () => void
    onDragStart?: (itemId: string) => void
    onDrop?: (itemId: string) => void
    onSelect?: (itemId: string) => void
    onValuesChange: (values: string[]) => void
    classes?: {
        root?: string
    }
}

export function PromptTabs(props: PromptTabsProps) {
    return (
        <ArkTagsInput.Root
            class={cn('min-w-0', props.classes?.root)}
            value={props.items.map(item => item.label)}
            onValueChange={details => props.onValuesChange(details.value)}
        >
            <ArkTagsInput.Control class='flex min-w-0 flex-wrap items-end gap-0.5'>
                <For each={props.items}>
                    {item => (
                        <ArkTagsInput.Item
                            class={cn(
                                'inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-t-md pl-2 pr-1 text-xs leading-none',
                                item.id === props.selectedId
                                    // 與下方 panel 同色、無分隔線，負 margin 蓋掉接縫
                                    ? '-mb-0.5 bg-active pb-0.5 text-fg shadow-[inset_0_2px_0_var(--sp-accent)]'
                                    : 'text-fg-muted hover:bg-white/[0.045] hover:text-fg-secondary',
                                item.id === props.draggedId && 'opacity-50',
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
                                class='shrink-0 opacity-35'
                                size={12}
                                strokeWidth={1.8}
                                aria-hidden='true'
                            />
                            <ArkTagsInput.ItemPreview class='flex min-w-0 items-center gap-1'>
                                <ArkTagsInput.ItemText class='min-w-0 truncate'>{item.label}</ArkTagsInput.ItemText>
                                <ArkTagsInput.ItemDeleteTrigger
                                    class='flex size-4 shrink-0 items-center justify-center rounded text-fg-muted hover:bg-white/[0.09] hover:text-fg'
                                >
                                    <X
                                        size={12}
                                        strokeWidth={2}
                                        aria-hidden='true'
                                    />
                                </ArkTagsInput.ItemDeleteTrigger>
                            </ArkTagsInput.ItemPreview>
                            <ArkTagsInput.ItemInput class='h-5 min-w-16 rounded border border-accent/60 bg-active px-1 text-xs text-fg outline-none' />
                        </ArkTagsInput.Item>
                    )}
                </For>
                <ArkTagsInput.Input
                    class='h-7 min-w-8 flex-1 bg-transparent px-2 text-xs text-fg outline-none placeholder:text-fg-muted'
                    placeholder='+'
                />
                <ArkTagsInput.HiddenInput />
            </ArkTagsInput.Control>
        </ArkTagsInput.Root>
    )
}
