import { createSignal, onCleanup, onMount } from 'solid-js'

import { GenerateTaskDetail } from '#/pages/generate/components/config/GenerateTaskDetail'
import { MobilePrompt } from '#/pages/generate/components/mobile/MobilePrompt'
import { GenerateStage } from '#/pages/generate/components/workspace/GenerateStage'
import { mergeClasses } from '#/utils/style'

const size = {
    header: 36,
    bar: 50,
    peek: 56,
    radius: 14,
}

export function MobileTaskView() {
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
            class='relative overflow-clip rounded-lg border border-line-subtle bg-stage'
            style={{
                '--mobile-header': `${size.header}px`,
                '--mobile-bar': `${size.bar}px`,
                '--mobile-peek': `${size.peek}px`,
                '--mobile-radius': `${size.radius}px`,
                '--mobile-stage': `${stageHeight()}px`,
            }}
        >
            <GenerateStage
                class={mergeClasses(
                    'sticky top-(--mobile-header) mb-[calc(var(--mobile-peek)+var(--mobile-radius)-var(--mobile-stage))] min-h-0 flex-none rounded-none border-0',
                    docked() && 'mobile-peek-mask z-20 [clip-path:inset(0_0_calc(100%-var(--mobile-peek)-var(--mobile-radius))_0)]',
                )}
                onSurfaceClick={covered() > 0 ? scrollToTop : undefined}
                fit={{ covered: covered(), peek: size.peek }}
            />
            <div
                ref={element => { sheet = element }}
                class='relative z-0 mt-[calc(var(--mobile-stage)-var(--mobile-peek)-var(--mobile-radius))] min-h-[calc(100dvh-var(--mobile-header)-var(--mobile-bar)-var(--mobile-peek))] rounded-t-(--mobile-radius) bg-surface pt-1'
            >
                <MobilePrompt />
                <div class='mx-4 my-1 border-t border-line-subtle' />
                <div class='flex flex-col gap-3 px-4 pt-3 pb-5'>
                    <GenerateTaskDetail bare />
                </div>
            </div>
        </div>
    )
}
