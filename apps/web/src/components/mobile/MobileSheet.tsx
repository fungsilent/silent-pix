import { createSignal, onCleanup, onMount, Show } from 'solid-js'

import { mergeClasses } from '#/utils/style'

import type { MobileFit } from '#/lib/mobile-fit'
import type { JSX } from 'solid-js'

const size = {
    header: 36,
    peek: 56,
    radius: 8,
    gap: 4,
}

type MobileSheetStage = {
    class: string
    onSurfaceClick: (() => void) | undefined
    fit: MobileFit
}

type MobileSheetProps = {
    inert?: boolean | undefined
    stage: (stage: MobileSheetStage) => JSX.Element
    children: JSX.Element
}

/* 手機頁：圖片卡黏在 Header 下方，內容卡整頁捲動蓋上去並停在露出條 */
export function MobileSheet(props: MobileSheetProps) {
    let card: HTMLDivElement | undefined
    let sheet: HTMLDivElement | undefined
    const [covered, setCovered] = createSignal(0)
    const [docked, setDocked] = createSignal(false)
    const [stageHeight, setStageHeight] = createSignal(0)
    const updateScroll = () => {
        if (!card || !sheet) return
        setCovered(Math.max(0, size.header - card.getBoundingClientRect().top - card.clientTop))
        setDocked(sheet.getBoundingClientRect().top <= size.header + size.peek + 0.5)
    }
    const scrollToTop = () => window.scrollTo({ top: 0, behavior: 'smooth' })

    window.addEventListener('scroll', updateScroll, { passive: true })
    onCleanup(() => window.removeEventListener('scroll', updateScroll))

    const stageObserver = new ResizeObserver(([entry]) => setStageHeight(entry?.borderBoxSize[0]?.blockSize ?? 0))
    onCleanup(() => stageObserver.disconnect())
    onMount(() => {
        const stage = card?.firstElementChild
        if (stage) stageObserver.observe(stage)
    })

    return (
        <div
            ref={element => { card = element }}
            data-page-scroll
            inert={props.inert}
            class='relative'
            style={{
                '--mobile-header': `${size.header}px`,
                '--mobile-peek': `${size.peek}px`,
                '--mobile-radius': `${size.radius}px`,
                '--mobile-gap': `${size.gap}px`,
                '--mobile-stage': `${stageHeight()}px`,
            }}
        >
            {props.stage({
                get class() {
                    return mergeClasses(
                        'sticky top-(--mobile-header) mb-[calc(var(--mobile-peek)+var(--mobile-radius)-var(--mobile-stage))] min-h-0 flex-none',
                        docked() && 'mobile-peek-mask z-20 [clip-path:inset(0_0_calc(100%-var(--mobile-peek)-var(--mobile-radius))_0)]',
                    )
                },
                get onSurfaceClick() {
                    return covered() > 0 ? scrollToTop : undefined
                },
                get fit() {
                    return { covered: covered(), peek: size.peek }
                },
            })}
            <Show when={docked()}>
                {/* 停靠後內容從圖片卡下面捲過：圓角外範圍填上背景色阻止內容卡露出 */}
                <div class='pointer-events-none sticky top-(--mobile-header) z-[19] -mb-2 h-2 bg-shell' />
                {/* 停靠後補畫內容卡的上框線與圓弧 */}
                <div class='mobile-sheet-edge pointer-events-none sticky top-[calc(var(--mobile-header)+var(--mobile-peek))] z-[21] -mb-2 h-2' />
            </Show>
            <div
                ref={element => { sheet = element }}
                class='relative z-0 mt-[calc(var(--mobile-stage)-var(--mobile-peek)-var(--mobile-radius)+var(--mobile-gap))] min-h-[calc(100dvh-var(--mobile-header)-var(--mobile-peek))] mb-[68px] rounded-(--mobile-radius) border border-line-subtle bg-surface pt-1'
            >
                {props.children}
            </div>
        </div>
    )
}
