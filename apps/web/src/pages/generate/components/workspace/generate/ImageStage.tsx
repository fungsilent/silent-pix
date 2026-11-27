import { ChevronLeft, ChevronRight, Columns2, Expand, Image as ImageIcon, ImagePlus } from 'lucide-solid'
import { createEffect, createMemo, createSignal, For, on, onCleanup, Show } from 'solid-js'

import { Button } from '#/components/base/Button'
import { Loading } from '#/components/base/Loading'
import { StatusMessage } from '#/components/base/StatusMessage'
import { resolveImageUrl } from '#/data/image/image.api'
import { t } from '#/lib/i18n'
import { createHotkeys } from '#/lib/keyboard'
import { theme } from '#/lib/theme'
import { mergeClasses } from '#/utils/style'

import type { ImageApi } from '@silent-pix/shared'

type ImageStageProps = {
    images: ImageApi.ImageResource[]
    keyboardEnabled: boolean
    loading: boolean
    source?: boolean
    selectedIndex: number
    onCompare: (image: ImageApi.ImageResource) => void
    onExpand: () => void
    onSurfaceClick?: (() => void) | undefined
    onSelect: (index: number) => void
    onUseAsReference: (image: ImageApi.ImageResource) => void
    class?: string | undefined
    fit?: { covered: number, peek: number } | undefined
}

const fitHeight = { min: 160, max: 360, empty: 240 }
const stripHeight = 80

const glass = 'border-stage-line bg-stage-control text-on-stage hover:bg-stage-control-hover backdrop-blur-[8px]'

export function ImageStage(props: ImageStageProps) {
    const selectedImage = () => props.images[props.selectedIndex] ?? props.images[0]
    const hasMany = () => props.images.length > 1

    /* 只有手機 fit 需要圖片區寬度 */
    let area: HTMLDivElement | undefined
    const [areaWidth, setAreaWidth] = createSignal(0)
    createEffect(on(() => props.fit !== undefined, enabled => {
        if (!enabled || !area) return

        const observer = new ResizeObserver(([entry]) => setAreaWidth(entry?.contentRect.width ?? 0))
        observer.observe(area)
        onCleanup(() => observer.disconnect())
    }))

    const aspect = () => {
        const image = selectedImage()
        return image ? image.width / image.height : undefined
    }
    const areaHeight = () => {
        const ratio = aspect()
        return ratio ? Math.min(fitHeight.max, Math.max(fitHeight.min, areaWidth() / ratio)) : fitHeight.empty
    }
    const fitBox = createMemo(() => {
        const fit = props.fit
        const ratio = aspect()
        const width = areaWidth()
        if (!fit || !ratio || width === 0) return undefined

        const height = areaHeight()
        /* 縮圖列在下方，先被蓋住 */
        const visible = Math.min(height, Math.max(fit.peek, height + (hasMany() ? stripHeight : 0) - fit.covered))
        const progress = (height - visible) / (height - fit.peek)
        const contain = Math.min(width, height * ratio)
        const cover = Math.max(width, fit.peek * ratio)
        const imageWidth = contain + (cover - contain) * progress
        const imageHeight = imageWidth / ratio

        return {
            left: `${(width - imageWidth) / 2}px`,
            top: `${visible / 2 - imageHeight / 2}px`,
            width: `${imageWidth}px`,
            height: `${imageHeight}px`,
        }
    })

    const selectPrevious = () => {
        if (props.images.length === 0) {
            return
        }

        props.onSelect((props.selectedIndex - 1 + props.images.length) % props.images.length)
    }
    const selectNext = () => {
        if (props.images.length === 0) {
            return
        }

        props.onSelect((props.selectedIndex + 1) % props.images.length)
    }

    createHotkeys([
        { key: 'ArrowLeft', modifiers: 'any', preventDefault: true, onPress: selectPrevious },
        { key: 'ArrowRight', modifiers: 'any', preventDefault: true, onPress: selectNext },
    ], () => props.keyboardEnabled && props.images.length >= 2)

    return (
        <section
            class={mergeClasses(
                theme.card, 'relative flex min-h-[240px] flex-1 flex-col',
                selectedImage() ? 'bg-stage' : 'bg-stage-empty',
                props.class,
            )}
            style={props.fit ? { height: `${areaHeight() + (hasMany() ? stripHeight : 0)}px` } : undefined}
            inert={props.loading}
        >
            <div
                ref={element => { area = element }}
                class='relative flex min-h-0 flex-1 items-center justify-center overflow-hidden'
                onClick={event => {
                    const onImage = event.target instanceof HTMLImageElement
                    if (event.target !== event.currentTarget && !onImage) return
                    if (props.onSurfaceClick) props.onSurfaceClick()
                    else if (onImage) props.onExpand()
                }}
            >
                <Show
                    when={selectedImage()}
                    fallback={(
                        <Show when={!props.loading}>
                            <StatusMessage
                                kind='empty'
                                title={t('generate.noImage')}
                                icon={(
                                    <ImageIcon
                                        size={21}
                                        strokeWidth={1.5}
                                    />
                                )}
                            />
                        </Show>
                    )}
                >
                    {image => (
                        <img
                            class={fitBox() ? 'absolute max-w-none' : 'h-full w-full object-contain'}
                            style={fitBox()}
                            src={resolveImageUrl(image().url)}
                            alt={t('generate.previewAlt')}
                        />
                    )}
                </Show>

                <Show when={props.source && selectedImage()}>
                    <span class='absolute left-3 top-3 flex h-6 items-center rounded-md border border-stage-line bg-stage-control px-2 text-[11px] font-medium leading-none text-on-stage backdrop-blur-[8px]'>
                        {t('generate.sourceImages')}
                    </span>
                </Show>

                <Loading.Hide
                    class='absolute right-3 top-3 flex gap-2'
                    loading={() => props.loading}
                >
                    <Button
                        variant='ghost'
                        title={t('image.viewFull')}
                        classes={{ root: mergeClasses('size-8 rounded-md border p-0', glass) }}
                        onClick={props.onExpand}
                    >
                        <Expand
                            size={15}
                            strokeWidth={1.8}
                        />
                    </Button>
                    <Button
                        variant='ghost'
                        title={t('image.openInCompare')}
                        classes={{ root: mergeClasses('size-8 rounded-md border p-0', glass) }}
                        onClick={() => {
                            const image = selectedImage()
                            if (image) {
                                props.onCompare(image)
                            }
                        }}
                    >
                        <Columns2
                            size={15}
                            strokeWidth={1.8}
                        />
                    </Button>
                    <Button
                        variant='ghost'
                        title={t('image.useAsReference')}
                        classes={{ root: mergeClasses('size-8 rounded-md border p-0', glass) }}
                        onClick={() => {
                            const image = selectedImage()
                            if (image) {
                                props.onUseAsReference(image)
                            }
                        }}
                    >
                        <ImagePlus
                            size={15}
                            strokeWidth={1.8}
                        />
                    </Button>
                </Loading.Hide>

                <Show when={hasMany()}>
                    <Button
                        variant='ghost'
                        classes={{ root: mergeClasses('absolute left-3 top-1/2 size-8 -translate-y-1/2 rounded-md border p-0', glass) }}
                        onClick={selectPrevious}
                    >
                        <ChevronLeft
                            size={18}
                            strokeWidth={1.8}
                        />
                    </Button>
                    <Button
                        variant='ghost'
                        classes={{ root: mergeClasses('absolute right-3 top-1/2 size-8 -translate-y-1/2 rounded-md border p-0', glass) }}
                        onClick={selectNext}
                    >
                        <ChevronRight
                            size={18}
                            strokeWidth={1.8}
                        />
                    </Button>
                </Show>
            </div>

            <Show when={hasMany()}>
                <div class='relative h-20 shrink-0 border-t border-stage-line-subtle bg-stage-strip'>
                    <div class='scrollbar-hidden flex h-full items-center justify-center-safe gap-2 overflow-x-auto p-2'>
                        <For each={props.images}>
                            {(image, index) => (
                                <Button
                                    variant='ghost'
                                    classes={{
                                        root: mergeClasses(
                                            'h-full w-auto shrink-0 overflow-hidden rounded-md p-0',
                                            index() === props.selectedIndex
                                                ? 'opacity-100 ring-2 ring-stage-fg'
                                                : 'opacity-60 hover:opacity-100',
                                        ),
                                    }}
                                    onClick={() => props.onSelect(index())}
                                >
                                    <img
                                        class='h-full w-auto object-contain'
                                        src={resolveImageUrl(image.url)}
                                        alt=''
                                    />
                                </Button>
                            )}
                        </For>
                    </div>
                    <span class='pointer-events-none absolute right-[18px] top-1/2 -translate-y-1/2 text-xs text-stage-fg/75 tabular-nums'>
                        {props.selectedIndex + 1} / {props.images.length}
                    </span>
                </div>
            </Show>
        </section>
    )
}
