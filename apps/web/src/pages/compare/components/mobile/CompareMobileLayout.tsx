import { Eye, ImageOff, ImagePlus, ListX } from 'lucide-solid'
import { createSignal, Show } from 'solid-js'

import { Button } from '#/components/base/Button'
import { CenteredText } from '#/components/base/CenteredText'
import { StatusMessage } from '#/components/base/StatusMessage'
import { MobileSheet } from '#/components/mobile/MobileSheet'
import { ImageViewer } from '#/components/viewer/ImageViewer'
import { resolveImageUrl } from '#/data/image/image.api'
import { t } from '#/lib/i18n'
import { createMobileFit } from '#/lib/mobile-fit'
import { theme } from '#/lib/theme'
import { CompareDetail } from '#/pages/compare/components/CompareDetail'
import { AllHiddenState, EmptyCompareState } from '#/pages/compare/components/CompareEmpty'
import { CompareThumbnailStrip } from '#/pages/compare/components/CompareStrip'
import { useCompareSession } from '#/pages/compare/state/session'
import { mergeClasses } from '#/utils/style'

import type { MobileFit } from '#/lib/mobile-fit'
import type { CompareView } from '#/pages/compare/hooks/createCompareView'
import type { JSX } from 'solid-js'

export function CompareMobileLayout(props: { view: CompareView }) {
    const compareSession = useCompareSession()
    const view = props.view
    const strip = () => (
        <CompareThumbnailStrip
            entries={view.allEntries()}
            failedImageIds={view.failedImageIds()}
            selectedId={compareSession.state.selectedCompareImageId}
            onImageError={view.markFailed}
            onRemove={compareSession.removeCompare}
            onSelect={compareSession.selectCompare}
            onToggleHidden={compareSession.toggleCompareHidden}
        />
    )

    return (
        <>
            <Show
                when={view.allEntries().length > 0}
                fallback={(
                    <div class={mergeClasses(theme.card, 'flex min-h-0 flex-1')}>
                        <EmptyCompareState onAdd={() => view.setPickerOpen(true)} />
                    </div>
                )}
            >
                <Show
                    when={view.entries().length > 0}
                    fallback={(
                        /* 底部留給膠囊，縮圖列不被蓋住 */
                        <section class={mergeClasses(theme.card, 'mb-[68px] flex min-h-0 flex-1 flex-col bg-stage')}>
                            <AllHiddenState onShowAll={compareSession.showAllCompare} />
                            {strip()}
                        </section>
                    )}
                >
                    <MobileSheet
                        stage={stage => (
                            <CompareMobileStage
                                view={view}
                                strip={strip()}
                                class={stage.class}
                                onSurfaceClick={stage.onSurfaceClick}
                                fit={stage.fit}
                            />
                        )}
                    >
                        <div class='flex flex-col gap-3 px-4 pt-3 pb-5'>
                            <CompareDetail bare />
                        </div>
                    </MobileSheet>
                </Show>
                <CompareMobileBar view={view} />
            </Show>
        </>
    )
}

type CompareMobileStageProps = {
    view: CompareView
    strip: JSX.Element
    class: string
    onSurfaceClick: (() => void) | undefined
    fit: MobileFit
}

const swipeDistance = 40

function CompareMobileStage(props: CompareMobileStageProps) {
    const [expanded, setExpanded] = createSignal(false)
    const mobileFit = createMobileFit({
        fit: () => props.fit,
        aspect: () => {
            const entry = props.view.selectedEntry()
            return entry ? entry.image.width / entry.image.height : undefined
        },
        strip: () => true,
    })
    /* 只認單指：第二指按下或被取消就放棄這次滑動 */
    let start: { id: number, x: number, y: number } | undefined
    let fingers = 0
    let swiped = false

    return (
        <>
            <section
                class={mergeClasses(theme.card, 'relative flex flex-col bg-stage', props.class)}
                style={{ height: `${mobileFit.stageHeight()}px` }}
            >
                <div
                    ref={mobileFit.setArea}
                    class='relative flex min-h-0 flex-1 touch-pan-y items-center justify-center overflow-hidden'
                    onPointerDown={event => {
                        fingers += 1
                        swiped = false
                        start = fingers === 1 ? { id: event.pointerId, x: event.clientX, y: event.clientY } : undefined
                    }}
                    onPointerCancel={() => {
                        fingers = Math.max(0, fingers - 1)
                        start = undefined
                    }}
                    onPointerUp={event => {
                        fingers = Math.max(0, fingers - 1)
                        if (start?.id !== event.pointerId) return
                        const dx = event.clientX - start.x
                        const dy = event.clientY - start.y
                        start = undefined
                        if (Math.abs(dx) < swipeDistance || Math.abs(dx) < Math.abs(dy)) return

                        swiped = true
                        if (dx < 0) props.view.selectNext()
                        else props.view.selectPrevious()
                    }}
                    onClick={() => {
                        if (swiped) return
                        if (props.onSurfaceClick) props.onSurfaceClick()
                        else if (props.view.selectedEntry()) setExpanded(true)
                    }}
                >
                    <Show when={props.view.selectedEntry()}>
                        {entry => (
                            <Show
                                when={!props.view.failedImageIds().has(entry().image.id)}
                                fallback={(
                                    <StatusMessage
                                        kind='empty'
                                        title={t('image.unavailable')}
                                        icon={(
                                            <ImageOff
                                                size={21}
                                                strokeWidth={1.5}
                                            />
                                        )}
                                    />
                                )}
                            >
                                <img
                                    class={mobileFit.box() ? 'absolute max-w-none select-none' : 'h-full w-full select-none object-contain'}
                                    style={mobileFit.box()}
                                    src={resolveImageUrl(entry().image.url)}
                                    alt=''
                                    draggable={false}
                                    onError={() => props.view.markFailed(entry().image.id)}
                                />
                            </Show>
                        )}
                    </Show>
                    <Show when={props.view.selectedEntry()}>
                        {entry => (
                            <CenteredText classes={{ root: 'absolute left-3 top-4 z-10 h-6 min-w-6 rounded-md bg-accent px-1.5 text-xs font-bold text-on-stage tabular-nums shadow-sm' }}>
                                {props.view.position(entry().image.id)}
                            </CenteredText>
                        )}
                    </Show>
                </div>
                {props.strip}
            </section>

            <Show when={expanded()}>
                <ImageViewer
                    images={props.view.images()}
                    selectedIndex={props.view.selectedIndex()}
                    onClose={() => setExpanded(false)}
                    onSelect={props.view.selectIndex}
                />
            </Show>
        </>
    )
}

function CompareMobileBar(props: { view: CompareView }) {
    const compareSession = useCompareSession()
    const icon = 'size-8 shrink-0 rounded-full p-0 text-fg'

    return (
        <div class={theme.mobilePill}>
            <span class='shrink-0 pl-3 pr-1 text-[13px] leading-none text-fg-secondary tabular-nums'>
                {props.view.entries().length} / {props.view.allEntries().length}
            </span>
            <Show when={props.view.hiddenCount() > 0 && props.view.entries().length > 0}>
                <Button
                    variant='ghost'
                    title={t('common.showAll')}
                    classes={{ root: icon }}
                    onClick={compareSession.showAllCompare}
                >
                    <Eye
                        size={16}
                        strokeWidth={1.8}
                    />
                </Button>
            </Show>
            <Button
                variant='ghost'
                title={t('compare.clearList')}
                classes={{ root: icon }}
                onClick={compareSession.clearCompare}
            >
                <ListX
                    size={16}
                    strokeWidth={1.8}
                />
            </Button>
            <span class='mx-1 h-5 w-px shrink-0 bg-line' />
            <Button
                variant='solid'
                tone='accent'
                classes={{ root: 'h-8 gap-1.5 rounded-full px-5 text-[13px] font-semibold' }}
                onClick={() => props.view.setPickerOpen(true)}
            >
                <ImagePlus
                    size={16}
                    strokeWidth={1.8}
                />
                {t('image.add')}
            </Button>
        </div>
    )
}
