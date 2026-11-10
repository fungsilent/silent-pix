import { FlagOff, FlagTriangleRight, HeartX, ListFilter } from 'lucide-solid'

import { FilterChips } from '#/components/base/FilterChips'
import { cn } from '#/lib/cn'
import { t } from '#/lib/i18n'

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
    label: () => string
    Icon: Component<LucideProps>
}

const allOption = { label: () => t('common.all'), Icon: ListFilter }

const filterOptions: FilterOption[] = [
    { value: 'unflag', label: () => t('task.filter.unflag'), Icon: FlagOff },
    { value: 'pin', label: () => t('task.filter.pin'), Icon: FlagTriangleRight },
    { value: 'discard', label: () => t('task.filter.discard'), Icon: HeartX },
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
