import { defaultKeymap, history, historyKeymap } from '@codemirror/commands'
import { EditorState } from '@codemirror/state'
import { EditorView, keymap } from '@codemirror/view'
import { createEffect, on, onCleanup } from 'solid-js'

import { serializePromptDocument } from '#/pages/generate/components/workspace/generate/prompt/prompt.document'
import { promptGutters } from '#/pages/generate/components/workspace/generate/prompt/prompt.gutter'
import { initialPromptMeta, promptMeta, promptMetaEffect, promptStateExtensions } from '#/pages/generate/components/workspace/generate/prompt/prompt.state'
import { promptTheme } from '#/pages/generate/components/workspace/generate/prompt/prompt.theme'

import type { PromptDocument } from '#/pages/generate/components/workspace/generate/prompt/prompt.document'
import type { JSX } from 'solid-js'

/* MARK: PromptEditor */
type PromptEditorProps = {
    /*
     * 只用來決定「什麼時候丟掉整個 EditorView」。同一個 task 內的 document 由
     * CodeMirror 自己保管，store 回寫不得重建 state，否則 history 會被清掉。
     */
    documentKey: string
    initialDocument: PromptDocument
    class?: string
    style?: JSX.CSSProperties
    onDocumentChange: (document: PromptDocument) => void
}

export function PromptEditor(props: PromptEditorProps) {
    let host: HTMLDivElement | undefined
    let view: EditorView | undefined

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
            const meta = initialPromptMeta(props.initialDocument, text)

            const state = EditorState.create({
                doc: props.initialDocument.text,
                extensions: [
                    promptGutters(),
                    EditorView.lineWrapping,
                    history(),
                    keymap.of([...defaultKeymap, ...historyKeymap]),
                    promptTheme,
                    promptStateExtensions(meta),
                    EditorView.updateListener.of(update => {
                        /* selection-only 的更新不必回寫 store */
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
            /* 真正在捲的是 .cm-scroller，沿用 app 既有的原生 scrollbar 樣式 */
            view.scrollDOM.classList.add('scrollbar-thin')
        },
    ))

    onCleanup(destroy)

    return (
        <div
            ref={element => { host = element }}
            class={props.class}
            style={props.style}
        />
    )
}
