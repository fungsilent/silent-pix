import { createStore } from '#/lib/store'
import { promptDefaultHeight, promptMinHeight } from '#/pages/generate/components/workspace/generate/prompt/prompt.theme'

import type { PromptKind } from '#/pages/generate/form'

type PromptLayoutState = {
    promptVisible: Record<PromptKind, boolean>
    promptHeight: Record<PromptKind, number>
    promptGutterVisible: boolean
}

const promptHeightKey = 'silent-pix.prompt-height'
const promptGutterKey = 'silent-pix.prompt-gutter'

function readPromptGutterVisible(): boolean {
    try {
        return localStorage.getItem(promptGutterKey) === 'true'
    }
    catch {
        return false
    }
}
const defaultPromptHeight = (): Record<PromptKind, number> => ({ positive: promptDefaultHeight, negative: promptDefaultHeight })

function readPromptHeight(): Record<PromptKind, number> {
    try {
        const value: unknown = JSON.parse(localStorage.getItem(promptHeightKey) ?? 'null')
        if (value && typeof value === 'object') {
            const { positive, negative } = value as Record<string, unknown>
            if (typeof positive === 'number' && typeof negative === 'number' && positive >= promptMinHeight && negative >= promptMinHeight) {
                return { positive, negative }
            }
        }
    }
    catch { /* 讀不到就用預設 */ }
    return defaultPromptHeight()
}

export function createPromptLayout() {
    return createStore<PromptLayoutState, {
        togglePromptVisible: (kind: PromptKind) => void
        setPromptHeight: (height: Partial<Record<PromptKind, number>>) => void
        resetPromptHeight: () => void
        togglePromptGutter: () => void
    }>(
        {
            promptVisible: { positive: true, negative: true },
            promptHeight: readPromptHeight(),
            promptGutterVisible: readPromptGutterVisible(),
        },
        store => {
            const writePromptHeight = (height: Record<PromptKind, number>) => {
                store.set('promptHeight', height)
                try {
                    localStorage.setItem(promptHeightKey, JSON.stringify(height))
                }
                catch { /* 存不了就只在這次生效 */ }
            }

            return {
                togglePromptVisible(kind) {
                    store.set('promptVisible', kind, visible => !visible)
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
                    try {
                        localStorage.setItem(promptGutterKey, String(visible))
                    }
                    catch { /* 存不了就只在這次生效 */ }
                },
            }
        },
    )
}
