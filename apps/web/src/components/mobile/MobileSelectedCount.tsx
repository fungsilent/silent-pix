import { X } from 'lucide-solid'

import { Button } from '#/components/base/Button'
import { t } from '#/lib/i18n'

export function MobileSelectedCount(props: { count: number, onClear: () => void }) {
    return (
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
    )
}
