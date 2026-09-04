import { createSignal, onCleanup } from 'solid-js'

import type { Accessor } from 'solid-js'

export type DragSelectionRect = {
    left: number
    top: number
    width: number
    height: number
}

export type DragSelectionMode = 'replace' | 'add' | 'remove'

type PointerSession = {
    mode: DragSelectionMode
    dragging: boolean
    initialSelection: Set<string>
    pointerId: number
    startX: number
    startY: number
}

export type DragSelectionOptions = {
    container: Accessor<HTMLElement | undefined>
    selectedIds: Accessor<readonly string[]>
    onSelectionChange: (ids: string[]) => void
    itemSelector: string
    controlSelector: string
    getItemId: (item: HTMLElement) => string | undefined
    threshold?: number
}

export function createDragSelection(options: DragSelectionOptions) {
    const threshold = options.threshold ?? 5
    const [marquee, setMarquee] = createSignal<DragSelectionRect>()
    const [tracking, setTracking] = createSignal(false)
    let pointerSession: PointerSession | undefined
    let suppressNextClick = false
    let suppressionTimer: ReturnType<typeof setTimeout> | undefined

    const isControl = (target: EventTarget | null): boolean => (
        target instanceof Element && Boolean(target.closest(options.controlSelector))
    )

    const hasReachedThreshold = (event: PointerEvent, session: PointerSession): boolean => {
        const deltaX = event.clientX - session.startX
        const deltaY = event.clientY - session.startY

        return deltaX * deltaX + deltaY * deltaY >= threshold * threshold
    }

    const getMarqueeRect = (event: PointerEvent, session: PointerSession): DragSelectionRect | undefined => {
        const container = options.container()

        if (!container) {
            return undefined
        }

        const bounds = container.getBoundingClientRect()
        const left = Math.min(session.startX, event.clientX)
        const top = Math.min(session.startY, event.clientY)

        return {
            left: left - bounds.left + container.scrollLeft,
            top: top - bounds.top + container.scrollTop,
            width: Math.abs(event.clientX - session.startX),
            height: Math.abs(event.clientY - session.startY),
        }
    }

    const updateSelection = (event: PointerEvent, session: PointerSession) => {
        const container = options.container()
        const rect = getMarqueeRect(event, session)

        if (!container || !rect) {
            return
        }

        const left = Math.min(session.startX, event.clientX)
        const right = Math.max(session.startX, event.clientX)
        const top = Math.min(session.startY, event.clientY)
        const bottom = Math.max(session.startY, event.clientY)
        const hitIds = [...container.querySelectorAll<HTMLElement>(options.itemSelector)]
            .filter(item => {
                const bounds = item.getBoundingClientRect()

                return bounds.left <= right
                    && bounds.right >= left
                    && bounds.top <= bottom
                    && bounds.bottom >= top
            })
            .map(options.getItemId)
            .filter((itemId): itemId is string => itemId !== undefined)

        setMarquee(rect)

        if (session.mode === 'replace') {
            options.onSelectionChange(hitIds)
            return
        }

        const nextSelection = new Set(session.initialSelection)

        hitIds.forEach(itemId => {
            if (session.mode === 'remove') {
                nextSelection.delete(itemId)
            }
            else {
                nextSelection.add(itemId)
            }
        })
        options.onSelectionChange([...nextSelection])
    }

    const markClickSuppressed = () => {
        suppressNextClick = true

        if (suppressionTimer) {
            clearTimeout(suppressionTimer)
        }

        suppressionTimer = setTimeout(() => {
            suppressNextClick = false
            suppressionTimer = undefined
        }, 0)
    }

    const consumeSuppressedClick = (): boolean => {
        if (!suppressNextClick) {
            return false
        }

        suppressNextClick = false

        if (suppressionTimer) {
            clearTimeout(suppressionTimer)
            suppressionTimer = undefined
        }

        return true
    }

    const removePointerListeners = () => {
        window.removeEventListener('pointermove', handlePointerMove)
        window.removeEventListener('pointerup', handlePointerUp)
        window.removeEventListener('pointercancel', handlePointerCancel)
    }

    const finishPointerSession = (event?: PointerEvent) => {
        const session = pointerSession

        if (!session) {
            return
        }

        if (event && event.pointerId === session.pointerId && session.dragging) {
            if (event.type === 'pointerup') {
                updateSelection(event, session)
            }
            markClickSuppressed()
        }

        pointerSession = undefined
        setTracking(false)
        setMarquee(undefined)
        removePointerListeners()
    }

    const handlePointerMove = (event: PointerEvent) => {
        const session = pointerSession

        if (!session || event.pointerId !== session.pointerId) {
            return
        }

        if (!session.dragging) {
            if (!hasReachedThreshold(event, session)) {
                return
            }

            session.dragging = true
            markClickSuppressed()
        }

        event.preventDefault()
        updateSelection(event, session)
    }

    const handlePointerUp = (event: PointerEvent) => {
        const session = pointerSession

        if (!session || event.pointerId !== session.pointerId) {
            return
        }

        if (!session.dragging && hasReachedThreshold(event, session)) {
            session.dragging = true
            markClickSuppressed()
            updateSelection(event, session)
        }

        finishPointerSession(event)
    }

    const handlePointerCancel = (event: PointerEvent) => {
        if (pointerSession?.pointerId === event.pointerId) {
            finishPointerSession()
        }
    }

    const handlePointerDown = (event: PointerEvent) => {
        if (
            !event.isPrimary
            || event.button !== 0
            || (event.pointerType !== 'mouse' && event.pointerType !== 'pen')
        ) {
            return
        }

        if (event.ctrlKey && !event.shiftKey) {
            return
        }

        const container = options.container()
        const target = event.target

        if (
            !container
            || !(target instanceof Node)
            || !container.contains(target)
            || isControl(target)
        ) {
            return
        }

        pointerSession = {
            mode: event.shiftKey && event.ctrlKey
                ? 'remove'
                : event.shiftKey
                    ? 'add'
                    : 'replace',
            dragging: false,
            initialSelection: new Set(options.selectedIds()),
            pointerId: event.pointerId,
            startX: event.clientX,
            startY: event.clientY,
        }
        setTracking(true)
        setMarquee(undefined)
        window.addEventListener('pointermove', handlePointerMove)
        window.addEventListener('pointerup', handlePointerUp)
        window.addEventListener('pointercancel', handlePointerCancel)
    }

    onCleanup(() => {
        finishPointerSession()

        if (suppressionTimer) {
            clearTimeout(suppressionTimer)
        }
    })

    return {
        consumeSuppressedClick,
        marquee,
        onPointerDown: handlePointerDown,
        tracking,
    }
}
