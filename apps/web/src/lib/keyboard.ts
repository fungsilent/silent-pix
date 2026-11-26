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
