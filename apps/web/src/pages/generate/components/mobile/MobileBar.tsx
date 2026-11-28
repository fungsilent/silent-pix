import { FlagTriangleRight, HeartX, Menu, Sparkles, Trash2 } from 'lucide-solid'

import { Button } from '#/components/base/Button'
import { MobileSelectedCount } from '#/components/mobile/MobileSelectedCount'
import { t } from '#/lib/i18n'
import { theme } from '#/lib/theme'
import { useGenerateDetail } from '#/pages/generate/state/detail'
import { useGenerateSession } from '#/pages/generate/state/session'
import { mergeClasses } from '#/utils/style'

type MobileBarProps = {
    tasksOpen: boolean
    onToggleTasks: () => void
}

export function MobileBar(props: MobileBarProps) {
    const generateSession = useGenerateSession()
    const detail = useGenerateDetail()
    const isSubmitting = generateSession.isSubmitting

    return (
        <div class={theme.mobilePill}>
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
        <div class={theme.mobilePill}>
            <MobileSelectedCount
                count={props.count}
                onClear={props.onClear}
            />
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
