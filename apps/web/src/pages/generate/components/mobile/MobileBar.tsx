import { Sparkles } from 'lucide-solid'

import { Button } from '#/components/base/Button'
import { t } from '#/lib/i18n'
import { useGenerateDetail } from '#/pages/generate/state/detail'
import { useGenerateSession } from '#/pages/generate/state/session'

export function MobileBar() {
    const generateSession = useGenerateSession()
    const detail = useGenerateDetail()
    const isSubmitting = generateSession.isSubmitting

    return (
        <div class='sticky bottom-0 z-30 -mb-1 flex shrink-0 gap-1.5 bg-shell pt-1.5 pb-2'>
            <Button
                type='submit'
                variant='solid'
                tone='accent'
                disabled={isSubmitting() || !detail.editable()}
                classes={{ root: 'h-9 flex-1 gap-1.5 text-[13px] font-semibold' }}
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
