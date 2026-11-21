import { X } from 'lucide-solid'

import { Button } from '#/components/base/Button'
import { t } from '#/lib/i18n'

/* 工具列上顯示已選數量的「n selected ×」（單張參考圖的選取 chip 另有自己的內容）：Task browser、圖片選擇器、LoRA 選擇器共用 */
export function SelectedCountChip(props: { count: number, onClear: () => void }) {
    return (
        <span class='flex h-7 shrink-0 items-center gap-1 rounded-md bg-selected pl-2.5 pr-1 text-xs font-medium leading-none text-fg tabular-nums'>
            {t('common.selectedCount', { count: props.count })}
            <Button
                variant='ghost'
                title={t('task.clearSelection')}
                classes={{ root: 'size-5 rounded p-0 text-fg-muted hover:text-fg' }}
                onClick={props.onClear}
            >
                <X
                    size={13}
                    strokeWidth={1.9}
                />
            </Button>
        </span>
    )
}
