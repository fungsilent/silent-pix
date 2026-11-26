import { createSignal, onCleanup, onMount } from 'solid-js'

/* 拖進視窗任何位置都能開檔；dragenter／dragleave 會在子元素間成對觸發，用計數判斷是否真的離開視窗 */
export function createWindowFileDrop(onDrop: (files: FileList | undefined) => void) {
    const [dragging, setDragging] = createSignal(false)

    onMount(() => {
        let depth = 0
        const hasFiles = (event: DragEvent) => event.dataTransfer?.types.includes('Files') ?? false
        const onEnter = (event: DragEvent) => {
            if (!hasFiles(event)) return
            depth += 1
            setDragging(true)
        }
        const onOver = (event: DragEvent) => {
            if (!hasFiles(event)) return
            event.preventDefault()
            if (event.dataTransfer) event.dataTransfer.dropEffect = 'copy'
        }
        const onLeave = (event: DragEvent) => {
            if (!hasFiles(event)) return
            depth = Math.max(0, depth - 1)
            if (depth === 0) setDragging(false)
        }
        const onDropEvent = (event: DragEvent) => {
            if (!hasFiles(event)) return
            event.preventDefault()
            depth = 0
            setDragging(false)
            onDrop(event.dataTransfer?.files)
        }

        window.addEventListener('dragenter', onEnter)
        window.addEventListener('dragover', onOver)
        window.addEventListener('dragleave', onLeave)
        window.addEventListener('drop', onDropEvent)
        onCleanup(() => {
            window.removeEventListener('dragenter', onEnter)
            window.removeEventListener('dragover', onOver)
            window.removeEventListener('dragleave', onLeave)
            window.removeEventListener('drop', onDropEvent)
        })
    })

    return dragging
}
