import { FlagTriangleRight, HeartX, Menu, Sparkles, Trash2, X } from 'lucide-solid'

import { Button } from '#/components/base/Button'
import { t } from '#/lib/i18n'
import { theme } from '#/lib/theme'
import { useGenerateDetail } from '#/pages/generate/state/detail'
import { useGenerateSession } from '#/pages/generate/state/session'
import { mergeClasses } from '#/utils/style'

const pillClass = 'fixed inset-x-0 bottom-[calc(12px+env(safe-area-inset-bottom))] z-30 mx-auto flex w-fit items-center gap-1 rounded-full border border-line bg-elevated p-1 shadow-popover'

type MobileBarProps = {
    tasksOpen: boolean
    onToggleTasks: () => void
}

export function MobileBar(props: MobileBarProps) {
    const generateSession = useGenerateSession()
    const detail = useGenerateDetail()
    const isSubmitting = generateSession.isSubmitting

    return (
        <div class={pillClass}>
            <Button
                variant='ghost'
                classes={{
                    root: mergeClasses(
                        'h-8 shrink-0 gap-1.5 rounded-full px-4 text-[13px]',
                        props.tasksOpen ? theme.selected : 'text-fg',
                    ),
                }}
                onClick={props.onToggleTasks}
            >
                <Menu
                    size={16}
                    strokeWidth={1.8}
                />
                {t('task.title')}
            </Button>
            <span class='mx-1 h-5 w-px shrink-0 bg-line' />
            <Button
                type='submit'
                variant='solid'
                tone='accent'
                disabled={isSubmitting() || !detail.editable()}
                classes={{ root: 'h-8 gap-1.5 rounded-full px-5 text-[13px] font-semibold' }}
            >
                <Sparkles
                    size={16}
                    strokeWidth={2.2}
                />
                {isSubmitting() ? t('generate.creating') : t('header.generate')}
            </Button>
        </div>
    )
}

type MobileSelectionBarProps = {
    count: number
    flagPending: boolean
    deletePending: boolean
    onClear: () => void
    onSetFlag: (flag: 'pin' | 'discard') => void
    onDelete: () => void
}

export function MobileSelectionBar(props: MobileSelectionBarProps) {
    const action = 'h-8 w-11 shrink-0 rounded-full p-0'

    return (
        <div class={pillClass}>
            <Button
                variant='ghost'
                title={t('task.clearSelection')}
                classes={{ root: 'h-8 shrink-0 gap-2 rounded-full px-3.5 text-[13px] text-fg tabular-nums' }}
                onClick={props.onClear}
            >
                <X
                    size={16}
                    strokeWidth={1.8}
                />
                {t('common.selectedCount', { count: props.count })}
            </Button>
            <span class='mx-1 h-5 w-px shrink-0 bg-line' />
            <Button
                variant='ghost'
                title={t('task.filter.pin')}
                disabled={props.flagPending}
                classes={{ root: mergeClasses(action, 'text-fg') }}
                onClick={() => props.onSetFlag('pin')}
            >
                <FlagTriangleRight
                    size={16}
                    strokeWidth={1.8}
                />
            </Button>
            <Button
                variant='ghost'
                title={t('task.filter.discard')}
                disabled={props.flagPending}
                classes={{ root: mergeClasses(action, 'text-fg') }}
                onClick={() => props.onSetFlag('discard')}
            >
                <HeartX
                    size={16}
                    strokeWidth={1.8}
                />
            </Button>
            <Button
                tone='danger'
                title={t('task.deleteSelectedTitle')}
                disabled={props.deletePending}
                classes={{ root: action }}
                onClick={props.onDelete}
            >
                <Trash2
                    size={16}
                    strokeWidth={1.8}
                />
            </Button>
        </div>
    )
}
