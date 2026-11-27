import { z } from 'zod'

import { readStorage, storageKeys, writeStorage } from '#/lib/storage'
import { createStore } from '#/lib/store'
import { promptDefaultHeight, promptMinHeight } from '#/pages/generate/components/workspace/prompt/prompt.theme'

import type { PromptKind } from '#/pages/generate/form'

type PromptLayoutState = {
    promptVisible: Record<PromptKind, boolean>
    promptHeight: Record<PromptKind, number>
    promptGutterVisible: boolean
}

const promptKinds = z.object({ positive: z.boolean(), negative: z.boolean() })
const promptHeights = z.object({ positive: z.number().min(promptMinHeight), negative: z.number().min(promptMinHeight) })
const defaultPromptHeight = (): Record<PromptKind, number> => ({ positive: promptDefaultHeight, negative: promptDefaultHeight })

export function createPromptLayout() {
    return createStore<PromptLayoutState, {
        togglePromptVisible: (kind: PromptKind) => void
        setPromptHeight: (height: Partial<Record<PromptKind, number>>) => void
        resetPromptHeight: () => void
        togglePromptGutter: () => void
    }>(
        {
            promptVisible: readStorage(storageKeys.generate.promptVisible, promptKinds) ?? { positive: true, negative: true },
            promptHeight: readStorage(storageKeys.generate.promptHeight, promptHeights) ?? defaultPromptHeight(),
            promptGutterVisible: readStorage(storageKeys.generate.promptGutter, z.boolean()) ?? false,
        },
        store => {
            const writePromptHeight = (height: Record<PromptKind, number>) => {
                store.set('promptHeight', height)
                writeStorage(storageKeys.generate.promptHeight, height)
            }

            return {
                togglePromptVisible(kind) {
                    store.set('promptVisible', kind, visible => !visible)
                    writeStorage(storageKeys.generate.promptVisible, store.state.promptVisible)
                },

                setPromptHeight(height) {
                    writePromptHeight({ ...store.state.promptHeight, ...height })
                },

                resetPromptHeight() {
                    writePromptHeight(defaultPromptHeight())
                },

                togglePromptGutter() {
                    const visible = !store.state.promptGutterVisible
                    store.set('promptGutterVisible', visible)
                    writeStorage(storageKeys.generate.promptGutter, visible)
                },
            }
        },
    )
}
