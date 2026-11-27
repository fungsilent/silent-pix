import { FlagOff, FlagTriangleRight, HeartX, LoaderCircle, RefreshCw, TriangleAlert } from 'lucide-solid'
import { createEffect, createMemo, createSignal, For } from 'solid-js'

import { Button } from '#/components/base/Button'
import { ImageViewer } from '#/components/viewer/ImageViewer'
import { t } from '#/lib/i18n'
import { createHotkeys } from '#/lib/interaction'
import { useGenerateDetail } from '#/pages/generate/state/detail'
import { mergeClasses } from '#/utils/style'

import type { TaskApi } from '@silent-pix/shared'
import type { LucideProps } from 'lucide-solid'
import type { Component } from 'solid-js'

type TaskBrowserViewerProps = {
    flagPending: boolean
    onFlagChange: (taskId: string, flag: TaskApi.TaskFlag | null) => void
    onClose: () => void
}

export function TaskBrowserViewer(props: TaskBrowserViewerProps) {
    const detail = useGenerateDetail()
    const [viewerIndex, setViewerIndex] = createSignal(0)
    const viewerImages = createMemo(() => detail.task()?.images ?? [])

    const setFlag = (flag: TaskApi.TaskFlag | null) => {
        const task = detail.task()

        if (task && !props.flagPending) {
            props.onFlagChange(task.id, flag)
        }
    }

    /* U／P／X 立即生效並留在目前這張；焦點在輸入框時不攔 */
    createHotkeys([
        { key: 'u', preventDefault: true, onPress: () => setFlag(null) },
        { key: 'p', preventDefault: true, onPress: () => setFlag('pin') },
        { key: 'x', preventDefault: true, onPress: () => setFlag('discard') },
    ], () => viewerImages().length > 0)

    const current = (): 'unflag' | TaskApi.TaskFlag => {
        const task = detail.task()
        return task?.pin ? 'pin' : task?.discard ? 'discard' : 'unflag'
    }

    createEffect(() => {
        const count = viewerImages().length

        if (count > 0) {
            setViewerIndex(index => Math.min(index, count - 1))
        }
    })

    /* 讀取中、失敗、沒有圖時放在 viewer 中央，不用畫面底部的浮動訊息 */
    const status = () => {
        if (detail.loading()) {
            return (
                <LoaderCircle
                    class='animate-spin text-stage-overlay-text'
                    size={20}
                    strokeWidth={1.8}
                />
            )
        }

        if (detail.error()) {
            return (
                <div class='flex max-w-[280px] flex-col items-center gap-3 text-center'>
                    <p class='m-0 flex items-start gap-1.5 text-left text-xs leading-relaxed text-stage-overlay-text'>
                        <TriangleAlert
                            class='mt-1 shrink-0 text-stage-danger'
                            size={12}
                            strokeWidth={2}
                        />
                        <span class='min-w-0'>{t('task.outputs.failed')}</span>
                    </p>
                    <Button
                        variant='ghost'
                        classes={{ root: 'mt-1 border-stage-line bg-stage-control text-on-stage backdrop-blur-[8px] hover:bg-stage-control-hover hover:text-on-stage' }}
                        onClick={() => detail.retry()}
                    >
                        <RefreshCw
                            size={14}
                            strokeWidth={1.8}
                        />
                        {t('common.retry')}
                    </Button>
                </div>
            )
        }

        return viewerImages().length === 0
            ? <span class='text-xs text-stage-overlay-text'>{t('task.outputs.empty')}</span>
            : undefined
    }

    return (
        <ImageViewer
            images={viewerImages()}
            selectedIndex={viewerIndex()}
            onClose={props.onClose}
            onSelect={setViewerIndex}
            status={status()}
            review={{
                controls: (
                    <ReviewFlagBar
                        current={current()}
                        pending={props.flagPending}
                        onChange={setFlag}
                    />
                ),
            }}
        />
    )
}

/* MARK: ReviewFlagBar */
type ReviewFlagBarProps = {
    current: 'unflag' | TaskApi.TaskFlag
    pending: boolean
    onChange: (flag: TaskApi.TaskFlag | null) => void
}

const reviewTone = {
    unflag: { active: 'bg-on-stage/20 text-on-stage', idle: 'text-on-stage/70 hover:bg-stage-control-hover hover:text-on-stage' },
    pin: { active: 'bg-pin text-pin-ink hover:bg-pin-hover', idle: 'bg-pin/25 text-on-stage/85 hover:bg-pin/35' },
    discard: { active: 'bg-discard text-discard-ink hover:bg-discard-hover', idle: 'bg-discard/25 text-on-stage/85 hover:bg-discard/35' },
}

function ReviewFlagBar(props: ReviewFlagBarProps) {
    const items: { flag: 'unflag' | TaskApi.TaskFlag, key: string, label: () => string, Icon: Component<LucideProps> }[] = [
        { flag: 'unflag', key: 'U', label: () => t('task.filter.unflag'), Icon: FlagOff },
        { flag: 'pin', key: 'P', label: () => t('task.filter.pin'), Icon: FlagTriangleRight },
        { flag: 'discard', key: 'X', label: () => t('task.filter.discard'), Icon: HeartX },
    ]

    return (
        <div class='flex h-8 items-center gap-0.5 rounded-md border border-stage-line bg-stage-control p-0.5 backdrop-blur-[8px]'>
            <For each={items}>
                {item => (
                    <Button
                        variant='ghost'
                        title={item.label()}
                        disabled={props.pending}
                        classes={{
                            root: mergeClasses(
                                'h-7 gap-1.5 rounded border-0 px-2',
                                props.current === item.flag ? reviewTone[item.flag].active : reviewTone[item.flag].idle,
                            ),
                        }}
                        onClick={() => props.onChange(item.flag === 'unflag' ? null : item.flag)}
                    >
                        <item.Icon
                            size={13}
                            strokeWidth={1.8}
                        />
                        <span class='ml-0.5 grid h-3.5 min-w-3.5 place-items-center rounded-sm border border-current/30 px-0.5 text-[9px] leading-none opacity-60'>
                            {item.key}
                        </span>
                    </Button>
                )}
            </For>
        </div>
    )
}
