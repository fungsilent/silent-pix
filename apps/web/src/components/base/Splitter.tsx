import { createSignal } from 'solid-js'

import { mergeClasses } from '#/utils/style'

type SplitterProps = {
    /* 拖曳方向：y 是上下（調高度，橫線），x 是左右（調寬度，直線）；預設 y */
    axis?: 'x' | 'y'
    disabled?: boolean
    onDragStart: () => (delta: number) => void
    onReset: () => void
    classes?: {
        root?: string
        line?: string
    }
}

export function Splitter(props: SplitterProps) {
    const [dragging, setDragging] = createSignal(false)
    const horizontal = () => props.axis === 'x'
    const position = (event: PointerEvent) => horizontal() ? event.clientX : event.clientY

    const onPointerDown = (event: PointerEvent) => {
        if (props.disabled || event.button !== 0) {
            return
        }

        event.preventDefault()
        const target = event.currentTarget as HTMLElement
        const start = position(event)
        const move = props.onDragStart()
        target.setPointerCapture(event.pointerId)
        setDragging(true)

        const onMove = (moveEvent: PointerEvent) => move(position(moveEvent) - start)
        const onUp = () => {
            setDragging(false)
            target.removeEventListener('pointermove', onMove)
            target.removeEventListener('pointerup', onUp)
            target.removeEventListener('pointercancel', onUp)
        }
        target.addEventListener('pointermove', onMove)
        target.addEventListener('pointerup', onUp)
        target.addEventListener('pointercancel', onUp)
    }

    return (
        <div
            class={mergeClasses('group relative shrink-0 touch-none', !props.disabled && (horizontal() ? 'cursor-ew-resize' : 'cursor-ns-resize'), props.classes?.root)}
            onPointerDown={onPointerDown}
            onDblClick={() => !props.disabled && props.onReset()}
        >
            <span
                class={mergeClasses(
                    'pointer-events-none absolute rounded-full bg-accent opacity-0',
                    horizontal() ? 'left-1/2 w-0.5 -translate-x-1/2' : 'top-1/2 h-0.5 -translate-y-1/2',
                    !props.disabled && 'group-hover:opacity-100',
                    dragging() && 'opacity-100',
                    props.classes?.line,
                )}
            />
        </div>
    )
}
