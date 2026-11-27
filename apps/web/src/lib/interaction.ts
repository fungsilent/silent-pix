import { onCleanup, onMount } from 'solid-js'

export function isEditableTarget(target: EventTarget | null): boolean {
    if (!(target instanceof HTMLElement)) {
        return false
    }

    return target.isContentEditable
        || target.tagName === 'INPUT'
        || target.tagName === 'TEXTAREA'
        || target.tagName === 'SELECT'
}

type Hotkey = (
    | { key: string, code?: never }
    | { code: string, key?: never }
) & {
    onPress: () => void
    onRelease?: () => void
    when?: () => boolean
    modifiers?: 'mod' | 'any'
    shift?: boolean
    allowInEditable?: boolean
    preventDefault?: boolean
}

function matches(binding: Hotkey, event: KeyboardEvent): boolean {
    const sameKey = binding.key === undefined
        ? event.code === binding.code
        : event.key.toLowerCase() === binding.key.toLowerCase()
    const modPressed = event.ctrlKey || event.metaKey

    return sameKey
        && (binding.modifiers === 'any' || (!event.altKey && modPressed === (binding.modifiers === 'mod')))
        && (binding.shift === undefined || binding.shift === event.shiftKey)
}

export function createHotkeys(bindings: readonly Hotkey[], enabled: () => boolean): void {
    const held = new Map<string, () => void>()
    const hasHeldBindings = bindings.some(binding => binding.onRelease)

    const keydown = (event: KeyboardEvent) => {
        if (event.defaultPrevented || !enabled()) return

        const editable = isEditableTarget(event.target)
        const binding = bindings.find(candidate =>
            matches(candidate, event)
            && (!editable || candidate.allowInEditable)
            && (candidate.when?.() ?? true))
        if (!binding) return

        if (binding.preventDefault) event.preventDefault()
        if (binding.onRelease) held.set(event.code || event.key, binding.onRelease)
        binding.onPress()
    }

    const keyup = (event: KeyboardEvent) => {
        const key = event.code || event.key
        const release = held.get(key)
        held.delete(key)
        release?.()
    }

    const releaseHeld = () => {
        for (const release of held.values()) release()
        held.clear()
    }

    onMount(() => {
        window.addEventListener('keydown', keydown)
        if (hasHeldBindings) {
            window.addEventListener('keyup', keyup)
            window.addEventListener('blur', releaseHeld)
        }
    })
    onCleanup(() => {
        window.removeEventListener('keydown', keydown)
        if (hasHeldBindings) {
            window.removeEventListener('keyup', keyup)
            window.removeEventListener('blur', releaseHeld)
            releaseHeld()
        }
    })
}

type Point = { x: number, y: number }

export function createPinch(options: {
    onStart?: () => void
    onPinch: (scale: number, center: Point) => void
}) {
    const touches = new Map<number, Point>()
    let lastDistance: number | undefined
    const distance = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y)
    const resetBaseline = () => {
        const [a, b] = [...touches.values()]
        lastDistance = touches.size === 2 ? distance(a!, b!) : undefined
    }

    return {
        active: () => lastDistance !== undefined,

        onPointerDown: (event: PointerEvent) => {
            if (event.pointerType !== 'touch') return

            touches.set(event.pointerId, { x: event.clientX, y: event.clientY })
            resetBaseline()
            if (touches.size === 2) options.onStart?.()
        },

        onPointerMove: (event: PointerEvent) => {
            if (!touches.has(event.pointerId)) return

            touches.set(event.pointerId, { x: event.clientX, y: event.clientY })
            if (lastDistance === undefined || touches.size !== 2) return

            const [a, b] = [...touches.values()] as [Point, Point]
            const next = distance(a, b)
            const scale = next / lastDistance
            lastDistance = next
            options.onPinch(scale, { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 })
        },

        onPointerUp: (event: PointerEvent) => {
            touches.delete(event.pointerId)
            resetBaseline()
        },
    }
}

/* 長按：按住 delay 毫秒且移動不超過 tolerance px 才觸發；觸發後吃掉隨後的 click */
export function createLongPress(options: {
    onLongPress: () => void
    delay?: number
    tolerance?: number
}) {
    const delay = options.delay ?? 500
    const tolerance = options.tolerance ?? 8
    let start: (Point & { id: number }) | undefined
    let timer: ReturnType<typeof setTimeout> | undefined
    let fired = false

    const cancel = () => {
        clearTimeout(timer)
        timer = undefined
        start = undefined
    }
    onCleanup(cancel)

    return {
        onPointerDown: (event: PointerEvent) => {
            if (!event.isPrimary) return

            cancel()
            fired = false
            start = { x: event.clientX, y: event.clientY, id: event.pointerId }
            timer = setTimeout(() => {
                fired = true
                cancel()
                options.onLongPress()
            }, delay)
        },

        onPointerMove: (event: PointerEvent) => {
            if (start?.id === event.pointerId && Math.hypot(event.clientX - start.x, event.clientY - start.y) > tolerance) cancel()
        },

        /* 放開、取消或移出元素都結束這次長按 */
        onPointerUp: cancel,

        /* 放在 click 的 capture 階段 */
        onClickCapture: (event: MouseEvent) => {
            if (!fired) return

            fired = false
            event.preventDefault()
            event.stopPropagation()
        },
    }
}
