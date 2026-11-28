import { Eye, ImagePlus, ListX } from 'lucide-solid'
import { Show } from 'solid-js'

import { Bar } from '#/components/base/Bar'
import { Button } from '#/components/base/Button'
import { CenteredText } from '#/components/base/CenteredText'
import { ZoomControls } from '#/components/viewer/ZoomControls'
import { ZoomStage } from '#/components/viewer/ZoomStage'
import { t } from '#/lib/i18n'
import { createImageZoom } from '#/lib/image-zoom'
import { theme } from '#/lib/theme'
import { AllHiddenState, EmptyCompareState } from '#/pages/compare/components/CompareEmpty'
import { CompareThumbnailStrip } from '#/pages/compare/components/CompareStrip'
import { useCompareSession } from '#/pages/compare/state/session'
import { mergeClasses } from '#/utils/style'

import type { CompareView } from '#/pages/compare/hooks/createCompareView'

export function CompareWorkspace(props: { view: CompareView }) {
    const compareSession = useCompareSession()
    const view = props.view
    const zoom = createImageZoom()

    return (
        <section
            class={mergeClasses(theme.card, 'flex min-h-0 min-w-0 flex-1 flex-col bg-canvas')}
        >
            <Show
                when={view.allEntries().length > 0}
                fallback={<EmptyCompareState onAdd={() => view.setPickerOpen(true)} />}
            >
                <Bar.Root classes={{ root: 'border-b border-line-subtle' }}>
                    <span class='min-w-0 truncate text-xs leading-none text-fg-secondary tabular-nums'>
                        {t('compare.shownCount', { shown: view.entries().length, total: view.allEntries().length })}
                    </span>
                    <Bar.Actions classes={{ root: 'shrink-0' }}>
                        <Show when={view.hiddenCount() > 0 && view.entries().length > 0}>
                            <Button
                                variant='ghost'
                                title={t('common.showAll')}
                                classes={{ root: 'size-7 shrink-0 p-0' }}
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
                            classes={{ root: 'size-7 shrink-0 p-0' }}
                            onClick={compareSession.clearCompare}
                        >
                            <ListX
                                size={16}
                                strokeWidth={1.8}
                            />
                        </Button>
                        <Button
                            variant='solid'
                            tone='accent'
                            title={t('image.add')}
                            classes={{ root: 'size-7 shrink-0 p-0' }}
                            onClick={() => view.setPickerOpen(true)}
                        >
                            <ImagePlus
                                size={16}
                                strokeWidth={1.8}
                            />
                        </Button>
                    </Bar.Actions>
                </Bar.Root>

                <Show
                    when={view.entries().length > 0}
                    fallback={<AllHiddenState onShowAll={compareSession.showAllCompare} />}
                >
                    <div class='relative flex min-h-0 flex-1 flex-col overflow-hidden bg-stage'>
                        <ZoomStage
                            images={view.images()}
                            selectedIndex={view.selectedIndex()}
                            zoom={zoom}
                            onClick={() => undefined}
                        />
                        <Show when={view.selectedEntry()}>
                            {entry => (
                                <CenteredText classes={{ root: 'absolute left-3 top-3 z-10 h-6 min-w-6 rounded-md bg-accent px-1.5 text-xs font-bold text-on-stage tabular-nums shadow-sm' }}>
                                    {view.position(entry().image.id)}
                                </CenteredText>
                            )}
                        </Show>
                        <ZoomControls zoom={zoom} />
                    </div>
                </Show>

                <CompareThumbnailStrip
                    entries={view.allEntries()}
                    failedImageIds={view.failedImageIds()}
                    selectedId={compareSession.state.selectedCompareImageId}
                    onImageError={view.markFailed}
                    onRemove={compareSession.removeCompare}
                    onSelect={compareSession.selectCompare}
                    onToggleHidden={compareSession.toggleCompareHidden}
                />
            </Show>
        </section>
    )
}
