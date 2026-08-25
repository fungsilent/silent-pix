import { Trash2 } from 'lucide-solid'

import { Button } from '#/components/base/Button'

/*
 * 跟 TaskDelete 一樣是右欄底部的紅色全寬按鈕。
 * PHASE 3 是 client-only，確認對話框與實際刪除在 PHASE 5。
 */
export function WorkflowDelete() {
    return (
        <Button
            variant='danger'
            aria-label='Delete workflow'
            disabled
            classes={{ root: 'w-full disabled:cursor-not-allowed disabled:opacity-60' }}
        >
            <Trash2
                size={13}
                strokeWidth={1.8}
                aria-hidden='true'
            />
            Delete workflow
        </Button>
    )
}
