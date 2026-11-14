import { FlagOff, FlagTriangleRight, HeartX, ListFilter } from 'lucide-solid'

import { FilterChips } from '#/components/base/FilterChips'
import { cn } from '#/lib/cn'
import { t } from '#/lib/i18n'
import { taskStore } from '#/store/task'

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

/*
 * 目前 feed 篩選下的空狀態文案，Task list 與 Task browser 共用：
 * 有搜尋字串 → 搜尋無結果；只篩一個 flag → 該 flag 專屬文案；多個 flag → 篩選無結果；都沒有 → 尚無 task。
 */
export function taskFilterEmptyCopy() {
    const flags = taskStore.state.feedTaskFlags

    if (taskStore.state.feedSearch.trim() !== '') {
        return { title: t('task.empty.noMatchTitle'), message: t('task.empty.searchMessage') }
    }

    if (flags === undefined) {
        return { title: t('task.empty.title'), message: t('task.empty.message') }
    }

    if (flags.length === 1) {
        const flag = flags[0]!

        return { title: t(`task.empty.${flag}Title`), message: t(`task.empty.${flag}Message`) }
    }

    return { title: t('task.empty.noMatchTitle'), message: t('task.empty.filterMessage') }
}
