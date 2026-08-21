import { Match, Switch } from 'solid-js'

import { CompareWorkspace } from '#/pages/generate/components/workspace/compare/CompareWorkspace'
import { GenerateWorkspace } from '#/pages/generate/components/workspace/generate/GenerateWorkspace'
import { workspaceStore } from '#/store/workspace'

export function Workspace() {
    return (
        <section
            class='flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-canvas'
            aria-label='Workspace'
        >
            <Switch>
                <Match when={workspaceStore.state.mode === 'generate'}>
                    <GenerateWorkspace />
                </Match>
                <Match when={workspaceStore.state.mode === 'compare'}>
                    <CompareWorkspace />
                </Match>
            </Switch>
        </section>
    )
}
