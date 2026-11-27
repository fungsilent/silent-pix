import { defaultKeymap, history, historyKeymap } from '@codemirror/commands'
import { Compartment, EditorState } from '@codemirror/state'
import { EditorView, keymap } from '@codemirror/view'
import { createEffect, on, onCleanup } from 'solid-js'

import { t } from '#/lib/i18n'
import { promptDocumentToMeta, serializePromptDocument } from '#/pages/generate/components/workspace/generate/prompt/prompt.document'
import { promptGroupLayers, promptGutters } from '#/pages/generate/components/workspace/generate/prompt/prompt.gutter'
import { promptMeta, promptMetaEffect, promptStateExtensions } from '#/pages/generate/components/workspace/generate/prompt/prompt.state'
import { createPromptTheme } from '#/pages/generate/components/workspace/generate/prompt/prompt.theme'
import { promptTokens } from '#/pages/generate/components/workspace/generate/prompt/prompt.token'
import { themeStore } from '#/store/theme'

import type { PromptDocument } from '#/pages/generate/components/workspace/generate/prompt/prompt.document'
import type { JSX } from 'solid-js'

type PromptEditorProps = {
    documentKey: string
    initialDocument: PromptDocument
    gutter?: boolean | undefined
    class?: string | undefined
    style?: JSX.CSSProperties
    onDocumentChange: (document: PromptDocument) => void
}

export function PromptEditor(props: PromptEditorProps) {
    let host: HTMLDivElement | undefined
    let view: EditorView | undefined
    const themeCompartment = new Compartment()
    const gutterCompartment = new Compartment()
    const gutterExtension = () => (props.gutter === false ? [] : promptGutters())

    const destroy = () => {
        view?.destroy()
        view = undefined
    }

    createEffect(on(
        () => props.documentKey,
        () => {
            destroy()
            if (!host) return

            const text = EditorState.create({ doc: props.initialDocument.text }).doc
            const meta = promptDocumentToMeta(props.initialDocument, text)

            const state = EditorState.create({
                doc: text,
                extensions: [
                    gutterCompartment.of(gutterExtension()),
                    promptGroupLayers(),
                    promptTokens(),
                    EditorView.lineWrapping,
                    history(),
                    keymap.of([...defaultKeymap, ...historyKeymap]),
                    themeCompartment.of(createPromptTheme(themeStore.state.theme)),
                    promptStateExtensions(meta),
                    EditorView.updateListener.of(update => {
                        const metaChanged = update.transactions.some(transaction => (
                            transaction.effects.some(effect => effect.is(promptMetaEffect))
                        ))
                        if (!update.docChanged && !metaChanged) return

                        props.onDocumentChange(
                            serializePromptDocument(promptMeta(update.state), update.state.doc),
                        )
                    }),
                ],
            })

            view = new EditorView({ state, parent: host })
            view.scrollDOM.classList.add('scrollbar-thin')
        },
    ))

    createEffect(() => {
        const theme = themeStore.state.theme

        view?.dispatch({
            effects: themeCompartment.reconfigure(createPromptTheme(theme)),
        })
    })

    createEffect(on(gutterExtension, extension => {
        view?.dispatch({ effects: gutterCompartment.reconfigure(extension) })
    }, { defer: true }))

    createEffect(() => {
        const title = t('generate.prompt.removeBoundary')

        view?.dom.querySelectorAll<HTMLButtonElement>('.cm-prompt-group-remove').forEach(button => {
            button.title = title
        })
    })

    onCleanup(destroy)

    return (
        <div
            ref={element => { host = element }}
            class={props.class}
            style={props.style}
        />
    )
}
