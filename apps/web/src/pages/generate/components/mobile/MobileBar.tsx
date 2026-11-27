import { Menu, Sparkles } from 'lucide-solid'

import { Button } from '#/components/base/Button'
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
        <div class='fixed inset-x-0 bottom-[calc(12px+env(safe-area-inset-bottom))] z-30 mx-auto flex w-fit items-center gap-1 rounded-full border border-line bg-elevated p-1 shadow-popover'>
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
