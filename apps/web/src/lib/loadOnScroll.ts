import { createEffect, createSignal, onCleanup } from 'solid-js'

import type { Accessor } from 'solid-js'

export function createLoadOnScroll(options: {
    canLoad: Accessor<boolean>
    load: () => void
}) {
    const [viewport, setViewport] = createSignal<HTMLElement>()
    const [trigger, setTrigger] = createSignal<HTMLElement>()

    createEffect(() => {
        const root = viewport()
        const target = trigger()
        if (!root || !target || !options.canLoad()) {
            return
        }

        const observer = new IntersectionObserver(entries => {
            if (entries[0]?.isIntersecting) {
                options.load()
            }
        }, { root, rootMargin: '200px 0px' })
        observer.observe(target)
        onCleanup(() => observer.disconnect())
    })

    return { setViewport, setTrigger }
}
