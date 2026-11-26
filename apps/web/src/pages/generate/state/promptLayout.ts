import { createStore } from '#/lib/store'
import { promptDefaultHeight, promptMinHeight } from '#/pages/generate/components/workspace/generate/prompt/prompt.theme'

import type { PromptKind } from '#/pages/generate/form'

type PromptLayoutState = {
    promptVisible: Record<PromptKind, boolean>
    /* 兩段 editor 的高度（px），由 prompt 區的兩條拖曳調整並記在本機 */
    promptHeight: Record<PromptKind, number>
}

const promptHeightKey = 'silent-pix.prompt-height'
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

/* Prompt 兩段的顯示與高度：純版面偏好，和表單、task 無關。由 Generate session 組合後對外 */
export function createPromptLayout() {
    return createStore<PromptLayoutState, {
        togglePromptVisible: (kind: PromptKind) => void
        setPromptHeight: (height: Partial<Record<PromptKind, number>>) => void
        resetPromptHeight: () => void
    }>(
        {
            promptVisible: { positive: true, negative: true },
            promptHeight: readPromptHeight(),
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
            }
        },
    )
}
