type Point = { x: number, y: number }
type Bounds = { left: number, top: number, right: number, bottom: number }

const alphaThreshold = 128

function createCanvas(width: number, height: number) {
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    return canvas
}

export async function createMaskCanvas(width: number, height: number, maskUrl: string | null) {
    const canvas = createCanvas(width, height)
    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    if (!ctx) throw new Error('Mask canvas is unavailable.')

    if (maskUrl) {
        const image = new Image()
        image.crossOrigin = 'anonymous'
        image.src = maskUrl
        await image.decode()
        if (image.naturalWidth !== width || image.naturalHeight !== height) {
            throw new Error('Mask size does not match the reference image.')
        }

        ctx.drawImage(image, 0, 0, width, height)
        const pixels = ctx.getImageData(0, 0, width, height)
        for (let i = 0; i < pixels.data.length; i += 4) {
            pixels.data[i + 3] = pixels.data[i]! * pixels.data[i + 3]! / 255
            pixels.data[i] = pixels.data[i + 1] = pixels.data[i + 2] = 255
        }
        ctx.putImageData(pixels, 0, 0)
    }

    const fullCanvas = { left: 0, top: 0, right: width, bottom: height }
    let previewBounds: Bounds | undefined = fullCanvas
    let previewColor: string | undefined

    const markStroke = (from: Point, to: Point, size: number) => {
        const margin = size / 2 + 1
        const left = Math.max(0, Math.floor(Math.min(from.x, to.x) - margin))
        const top = Math.max(0, Math.floor(Math.min(from.y, to.y) - margin))
        const right = Math.min(width, Math.ceil(Math.max(from.x, to.x) + margin))
        const bottom = Math.min(height, Math.ceil(Math.max(from.y, to.y) + margin))
        if (left >= right || top >= bottom) return

        previewBounds = previewBounds
            ? {
                left: Math.min(previewBounds.left, left),
                top: Math.min(previewBounds.top, top),
                right: Math.max(previewBounds.right, right),
                bottom: Math.max(previewBounds.bottom, bottom),
            }
            : { left, top, right, bottom }
    }

    const snapshot = () => {
        const pixels = ctx.getImageData(0, 0, width, height)
        const data = pixels.data
        let hasMask = false
        for (let i = 3; i < data.length; i += 4) {
            if (data[i]! >= alphaThreshold) {
                hasMask = true
                break
            }
        }
        return { pixels, hasMask }
    }

    // shortcut: full snapshots use a 128 MiB history budget with at least one undo, switch to stroke history if more depth is needed.
    const maxSnapshots = Math.max(2, Math.floor(128 * 1024 ** 2 / (width * height * 4)))
    const history = [snapshot()]
    let currentIndex = 0
    let originalInHistory = true
    const current = () => history[currentIndex]!

    const commit = () => {
        const next = snapshot()
        const previousPixels = new Uint32Array(current().pixels.data.buffer)
        const nextPixels = new Uint32Array(next.pixels.data.buffer)
        if (nextPixels.every((pixel, i) => pixel === previousPixels[i])) return

        history.splice(currentIndex + 1, history.length, next)
        if (history.length > maxSnapshots) {
            history.shift()
            originalInHistory = false
        }
        currentIndex = history.length - 1
    }

    const restore = (index: number) => {
        if (!history[index]) return

        currentIndex = index
        ctx.putImageData(current().pixels, 0, 0)
        previewBounds = fullCanvas
    }

    return {
        state: () => ({
            hasMask: current().hasMask,
            canUndo: currentIndex > 0,
            canRedo: currentIndex < history.length - 1,
        }),
        hasChanges: () => !originalInHistory || currentIndex !== 0,
        paint(from: Point, to: Point, size: number, erase: boolean) {
            markStroke(from, to, size)
            ctx.globalCompositeOperation = erase ? 'destination-out' : 'source-over'
            ctx.fillStyle = ctx.strokeStyle = '#fff'
            ctx.beginPath()
            if (from.x === to.x && from.y === to.y) {
                ctx.arc(to.x, to.y, size / 2, 0, Math.PI * 2)
                ctx.fill()
                return
            }

            ctx.lineWidth = size
            ctx.lineCap = 'round'
            ctx.moveTo(from.x, from.y)
            ctx.lineTo(to.x, to.y)
            ctx.stroke()
        },
        commit,
        undo: () => restore(currentIndex - 1),
        redo: () => restore(currentIndex + 1),
        clear() {
            ctx.clearRect(0, 0, width, height)
            previewBounds = fullCanvas
            commit()
        },
        drawPreview(preview: CanvasRenderingContext2D, color: string) {
            const bounds = previewColor === color ? previewBounds : fullCanvas
            if (!bounds) return

            const { left, top, right, bottom } = bounds
            const pixels = ctx.getImageData(left, top, right - left, bottom - top)
            for (let i = 3; i < pixels.data.length; i += 4) {
                pixels.data[i] = pixels.data[i]! >= alphaThreshold ? 255 : 0
            }
            preview.putImageData(pixels, left, top)
            preview.save()
            preview.beginPath()
            preview.rect(left, top, pixels.width, pixels.height)
            preview.clip()
            preview.globalCompositeOperation = 'source-in'
            preview.fillStyle = color
            preview.fillRect(left, top, pixels.width, pixels.height)
            preview.restore()
            previewBounds = undefined
            previewColor = color
        },
        async exportPng() {
            if (!current().hasMask) return null

            const output = createCanvas(width, height)
            const outputContext = output.getContext('2d')
            if (!outputContext) throw new Error('Mask export canvas is unavailable.')

            const { data } = current().pixels
            const pixels = outputContext.createImageData(width, height)
            for (let i = 0; i < data.length; i += 4) {
                const color = data[i + 3]! >= alphaThreshold ? 255 : 0
                pixels.data[i] = pixels.data[i + 1] = pixels.data[i + 2] = color
                pixels.data[i + 3] = 255
            }
            outputContext.putImageData(pixels, 0, 0)
            const blob = await new Promise<Blob | null>(resolve => output.toBlob(resolve, 'image/png'))
            if (!blob) throw new Error('Could not encode the mask as PNG.')

            return new File([blob], 'mask.png', { type: 'image/png' })
        },
    }
}
