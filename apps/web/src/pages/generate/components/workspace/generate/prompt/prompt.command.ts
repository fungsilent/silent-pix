import { promptMeta, promptMetaEffect } from '#/pages/generate/components/workspace/generate/prompt/prompt.state'

import type { EditorView } from '@codemirror/view'
import type { PromptEditorMeta } from '#/pages/generate/components/workspace/generate/prompt/prompt.document'

/* MARK: toggle group */

export function toggleGroup(view: EditorView, groupId: string): boolean {
    const meta = promptMeta(view.state)
    const index = meta.groups.findIndex(group => group.id === groupId)
    if (index < 0) return false

    const next: PromptEditorMeta = {
        groups: meta.groups.map((group, groupIndex) => (
            groupIndex === index
                ? { ...group, enabled: !group.enabled }
                : group
        )),
        disabledTokens: meta.disabledTokens,
    }

    view.dispatch({
        effects: promptMetaEffect.of(next),
        userEvent: 'prompt.toggleGroup',
    })

    return true
}
