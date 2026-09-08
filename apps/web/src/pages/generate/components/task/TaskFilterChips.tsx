import { FlagOff, ListFilter, Pin, Trash2 } from 'lucide-solid'

import { FilterChips } from '#/components/base/FilterChips'
import { cn } from '#/lib/cn'

import type { TaskApi } from '@silent-pix/shared'
import type { LucideProps } from 'lucide-solid'
import type { Component } from 'solid-js'

type TaskFilterChipsProps = {
    values: readonly TaskApi.TaskFilterFlag[] | undefined
    onChange: (values: TaskApi.TaskFilterFlag[] | undefined) => void
    presentation?: 'icon' | 'label'
    classes?: {
        root?: string
    }
}

type FilterOption = {
    value: TaskApi.TaskFilterFlag
    label: string
    Icon: Component<LucideProps>
}

const allOption = { label: 'All', Icon: ListFilter }

const filterOptions: FilterOption[] = [
    { value: 'unflag', label: 'Unflag', Icon: FlagOff },
    { value: 'pin', label: 'Pin', Icon: Pin },
    { value: 'discard', label: 'Discard', Icon: Trash2 },
]

export function TaskFilterChips(props: TaskFilterChipsProps) {
    return (
        <FilterChips
            allOption={allOption}
            options={filterOptions}
            values={props.values}
            onChange={props.onChange}
            {...(props.presentation ? { presentation: props.presentation } : {})}
            classes={{
                root: cn('px-2 pb-1', props.classes?.root),
            }}
        />
    )
}
