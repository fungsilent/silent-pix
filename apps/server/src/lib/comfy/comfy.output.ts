import { unlink } from 'node:fs/promises'
import { isAbsolute, relative, resolve } from 'node:path'

import type { ComfyImage } from '#/lib/comfy/comfy.client'

export async function removeComfyImage(outputDir: string, image: ComfyImage): Promise<void> {
    const target = resolveComfyImagePath(outputDir, image)

    if (!target) return

    try {
        await unlink(target)
    } catch (cause) {
        if (cause instanceof Error && 'code' in cause && cause.code === 'ENOENT') return

        console.error(`Failed to remove Comfy image ${target}.`, cause)
    }
}

function resolveComfyImagePath(outputDir: string, image: ComfyImage): string | undefined {
    if (!image.filename) return undefined

    const base = resolve(outputDir)
    const target = resolve(base, image.subfolder, image.filename)
    const inside = relative(base, target)

    if (!inside || inside.startsWith('..') || isAbsolute(inside)) return undefined

    return target
}
