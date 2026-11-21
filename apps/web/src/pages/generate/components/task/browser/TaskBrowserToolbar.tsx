import {
    FlagOff,
    FlagTriangleRight,
    HeartX,
    Search,
    Trash2,
    X,
} from 'lucide-solid'
import { Show } from 'solid-js'

import { Button } from '#/components/base/Button'
import { Text } from '#/components/field/Text'
import { ThumbnailSizeSlider } from '#/components/image/ThumbnailSize'
import { cn } from '#/lib/cn'
import { t } from '#/lib/i18n'
import { theme } from '#/lib/theme'

import type { TaskApi } from '@silent-pix/shared'
import type { ThumbnailGrid } from '#/components/image/ThumbnailSize'

export type SelectedFlag = 'unflag' | TaskApi.TaskFlag | undefined

type TaskBrowserToolbarProps = {
    search: string
    selectedCount: number
    selectedFlag: SelectedFlag
    onSearchChange: (search: string) => void
    onClearSelection: () => void
    onSetFlags: (flag: TaskApi.TaskFlag | null) => void
    flagPending: boolean
    onDeleteSelected: () => void
    onDeleteAll: () => void
    deletePending: boolean
    showPermanentDelete: boolean
    thumbnailGrid: ThumbnailGrid
}

const flagSegment = {
    unflag: { active: theme.selected, idle: theme.taskFlag.inactive },
    pin: { active: theme.taskFlag.pin.active, idle: 'bg-pin/22 text-pin-fg hover:bg-pin/32' },
    discard: { active: theme.taskFlag.discard.active, idle: 'bg-discard/22 text-discard-fg hover:bg-discard/32' },
}

/*
 * 一列 48px（底線畫在 48px 內），與 Task list 頂端的搜尋同高、同寬、同 baseline。左側是「範圍」（搜尋、勾選 chip），
 * 右側是「動作」（flag 三段、刪除），最右固定是縮圖大小滑桿。
 */
export function TaskBrowserToolbar(props: TaskBrowserToolbarProps) {
    const segment = (flag: 'unflag' | TaskApi.TaskFlag) => cn(
        'h-6 gap-1.5 rounded px-2.5 text-xs font-medium',
        props.selectedFlag === flag ? flagSegment[flag].active : flagSegment[flag].idle,
    )

    return (
        <div class='flex h-12 shrink-0 items-center gap-3 border-b border-line-subtle bg-surface px-2'>
            <div class='flex w-[234px] shrink-0'>
                <Text
                    label={t('task.search')}
                    value={props.search}
                    placeholder={t('task.searchPlaceholder')}
                    icon={(
                        <Search
                            size={14}
                            strokeWidth={1.7}
                        />
                    )}
                    classes={{ root: 'min-w-0 flex-1', label: 'hidden' }}
                    onInput={props.onSearchChange}
                />
            </div>

            <Show when={props.selectedCount > 0}>
                <span class='flex h-7 shrink-0 items-center gap-1 rounded-md bg-selected pl-2.5 pr-1 text-xs font-medium leading-none text-fg tabular-nums'>
                    {t('common.selectedCount', { count: props.selectedCount })}
                    <Button
                        variant='ghost'
                        title={t('task.clearSelection')}
                        classes={{ root: 'size-5 rounded p-0 text-fg-muted hover:text-fg' }}
                        onClick={props.onClearSelection}
                    >
                        <X
                            size={13}
                            strokeWidth={1.9}
                        />
                    </Button>
                </span>
            </Show>

            <div class='ml-auto flex shrink-0 items-center gap-2'>
                <Show
                    when={props.selectedCount > 0}
                    fallback={(
                        <Show when={props.showPermanentDelete}>
                            <Button
                                tone='danger'
                                disabled={props.deletePending}
                                size='compact'
                                onClick={props.onDeleteAll}
                            >
                                <Trash2
                                    size={13}
                                    strokeWidth={1.8}
                                />
                                {t('task.deleteDiscardedAction')}
                            </Button>
                        </Show>
                    )}
                >
                    <div class='flex h-7 items-center gap-0.5 rounded-md border border-line-subtle bg-elevated p-px'>
                        <Button
                            variant='ghost'
                            disabled={props.flagPending}
                            classes={{ root: segment('unflag') }}
                            onClick={() => props.onSetFlags(null)}
                        >
                            <FlagOff
                                size={13}
                                strokeWidth={1.8}
                            />
                            {t('task.filter.unflag')}
                        </Button>
                        <Button
                            variant='ghost'
                            disabled={props.flagPending}
                            classes={{ root: segment('pin') }}
                            onClick={() => props.onSetFlags('pin')}
                        >
                            <FlagTriangleRight
                                size={13}
                                strokeWidth={1.8}
                            />
                            {t('task.filter.pin')}
                        </Button>
                        <Button
                            variant='ghost'
                            disabled={props.flagPending}
                            classes={{ root: segment('discard') }}
                            onClick={() => props.onSetFlags('discard')}
                        >
                            <HeartX
                                size={13}
                                strokeWidth={1.8}
                            />
                            {t('task.filter.discard')}
                        </Button>
                    </div>
                    <span class='mx-1 h-5 w-px bg-line-subtle' />
                    <Button
                        tone='danger'
                        disabled={props.deletePending}
                        size='compact'
                        onClick={props.onDeleteSelected}
                    >
                        <Trash2
                            size={13}
                            strokeWidth={1.8}
                        />
                        {t('task.deleteSelectedButton', { count: props.selectedCount })}
                    </Button>
                </Show>

                <Show when={props.selectedCount > 0 || props.showPermanentDelete}>
                    <span class='h-5 w-px shrink-0 bg-line-subtle' />
                </Show>
                <ThumbnailSizeSlider grid={props.thumbnailGrid} />
            </div>
        </div>
    )
}
