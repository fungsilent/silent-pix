import { ListFilter, Pin, Trash2 } from 'lucide-solid'

import { Button } from '#/components/base/Button'
import { cn } from '#/lib/cn'

import type { TaskFeedFilter } from '#/store/task'
import type { LucideProps } from 'lucide-solid'
import type { Component } from 'solid-js'

export type TaskFilterChipsProps = {
    value: TaskFeedFilter
    onChange: (filter: TaskFeedFilter) => void
    classes?: {
        root?: string
    }
}

type FilterOption = {
    value: TaskFeedFilter
    label: string
    Icon: Component<LucideProps>
}

const filterOptions: FilterOption[] = [
    { value: 'all', label: 'All', Icon: ListFilter },
    { value: 'pinned', label: 'Pinned', Icon: Pin },
    { value: 'discard', label: 'Discard', Icon: Trash2 },
]

export function TaskFilterChips(props: TaskFilterChipsProps) {
    return (
        <div
            class={cn(
                'flex shrink-0 items-center gap-1 px-2 pb-1',
                props.classes?.root,
            )}
            role='group'
            aria-label='Task filter'
        >
            {filterOptions.map(option => (
                <Button
                    variant='ghost'
                    aria-label={`Show ${option.label.toLowerCase()} tasks`}
                    aria-pressed={props.value === option.value}
                    classes={{
                        root: cn(
                            'h-7 gap-1.5 rounded-md px-2 text-[11px] font-medium',
                            props.value === option.value
                                ? 'bg-active text-fg shadow-[inset_0_0_0_1px_rgba(255,255,255,0.06)]'
                                : 'text-fg-muted',
                        ),
                    }}
                    onClick={() => props.onChange(option.value)}
                >
                    <option.Icon
                        size={13}
                        strokeWidth={1.8}
                        aria-hidden='true'
                    />
                    {option.label}
                </Button>
            ))}
        </div>
    )
}
