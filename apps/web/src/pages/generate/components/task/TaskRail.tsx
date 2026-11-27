import { LayoutGrid, SquarePen } from 'lucide-solid'

import { Button } from '#/components/base/Button'
import { t } from '#/lib/i18n'
import { theme } from '#/lib/theme'
import { TaskFilterChips } from '#/pages/generate/components/task/TaskFilterChips'
import { useGenerateSession } from '#/pages/generate/state/session'
import { mergeClasses } from '#/utils/style'

import type { TaskApi } from '@silent-pix/shared'
import type { JSX } from 'solid-js'

type TaskRailProps = {
    toggle?: JSX.Element
    gridActive: boolean
    onFilterChange: (taskFlags: TaskApi.TaskFilterFlag[] | undefined) => void
    onNewDraft?: (() => void) | undefined
}

export function TaskRail(props: TaskRailProps) {
    const generateSession = useGenerateSession()
    return (
        <nav class='flex w-10 shrink-0 flex-col items-center border-r border-line-subtle bg-surface'>
            <div class='flex h-12 shrink-0 items-center justify-center'>
                {props.toggle}
            </div>
            <div class='flex flex-col items-center gap-1'>
                <Button
                    size='bar'
                    variant='ghost'
                    title={t('task.newDraft')}
                    classes={{ root: 'size-7 shrink-0 p-0' }}
                    onClick={() => {
                        generateSession.startNewDraft()
                        props.onNewDraft?.()
                    }}
                >
                    <SquarePen
                        size={15}
                        strokeWidth={1.8}
                    />
                </Button>
                <div class='my-1 h-px w-5 bg-line-subtle' />
                <Button
                    size='bar'
                    variant='ghost'
                    title={t('task.gridView')}
                    classes={{ root: mergeClasses('size-7 shrink-0 p-0', props.gridActive && theme.selected) }}
                    onClick={() => generateSession.setBrowserOpen(!props.gridActive)}
                >
                    <LayoutGrid
                        size={15}
                        strokeWidth={1.8}
                    />
                </Button>
                <div class='my-1 h-px w-5 bg-line-subtle' />
                <TaskFilterChips
                    values={generateSession.state.feedTaskFlags}
                    onChange={props.onFilterChange}
                    presentation='icon'
                    classes={{ root: 'flex-col px-0 pb-0' }}
                />
            </div>
        </nav>
    )
}
