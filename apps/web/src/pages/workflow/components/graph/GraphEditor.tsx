import { defaultKeymap, history, historyKeymap } from '@codemirror/commands'
import { Annotation, Compartment, EditorState } from '@codemirror/state'
import { EditorView, keymap, lineNumbers, placeholder } from '@codemirror/view'
import { createEffect, onCleanup, onMount } from 'solid-js'

import { parseGraphText } from '#/pages/workflow/components/graph/graph.document'
import {
    fieldGutter,
    lineMarkDecorations,
    lineMarkField,
    setLineMarks,
} from '#/pages/workflow/components/graph/graph.mark'
import { workflowEditorTheme } from '#/pages/workflow/components/graph/graph.theme'
import { workflowTokens } from '#/pages/workflow/components/graph/graph.token'

import type { LineMark } from '#/pages/workflow/components/graph/graph.document'

/*
 * 標記「這次 doc 變動是程式同步進來的」。沒有它的話，載入一筆 workflow
 * 就會走成：props.value 變 → dispatch → updateListener → onChange →
 * store 以為使用者改了東西，於是什麼都還沒動就顯示 Unsaved。
 */
const syncFromProps = Annotation.define<boolean>()

type GraphEditorProps = {
    value: string
    marks: Map<number, LineMark>
    readOnly: boolean
    onChange: (value: string) => void
}

export function GraphEditor(props: GraphEditorProps) {
    let host: HTMLDivElement | undefined
    let view: EditorView | undefined
    const readOnlyCompartment = new Compartment()

    onMount(() => {
        if (!host) return

        const state = EditorState.create({
            doc: props.value,
            extensions: [
                lineNumbers(),
                fieldGutter,
                lineMarkField,
                lineMarkDecorations,
                workflowTokens,
                history(),
                keymap.of([...defaultKeymap, ...historyKeymap]),
                placeholder('Paste the ComfyUI API JSON here.'),
                workflowEditorTheme,
                readOnlyCompartment.of(EditorState.readOnly.of(props.readOnly)),
                EditorView.updateListener.of(update => {
                    if (!update.docChanged) return

                    if (update.transactions.some(transaction => transaction.annotation(syncFromProps))) {
                        return
                    }

                    const text = update.state.doc.toString()

                    /*
                     * 只在貼上時重排版。ComfyUI 的 Export (API) 會給漂亮的 JSON，
                     * 但從 console 複製出來的是壓縮的一行——那種貼進來讀不了，
                     * gutter 也算不出「哪個 input 在第幾行」。
                     * 只認貼上這個動作，才不會在使用者打字時搶游標。
                     */
                    if (update.transactions.some(transaction => transaction.isUserEvent('input.paste'))) {
                        const parse = parseGraphText(text)

                        if (parse.status === 'ok' && parse.text !== text) {
                            queueMicrotask(() => {
                                view?.dispatch({
                                    changes: { from: 0, to: view.state.doc.length, insert: parse.text },
                                })
                            })
                            return
                        }
                    }

                    props.onChange(text)
                }),
            ],
        })

        view = new EditorView({ state, parent: host })
        /* 真正在捲的是 .cm-scroller，沿用 app 既有的原生 scrollbar 樣式 */
        view.scrollDOM.classList.add('scrollbar-thin')
    })

    /*
     * 換 workflow、或貼上之後被正規化，doc 都要跟著換。
     * 值一樣就不 dispatch，否則 updateListener 會把游標推回開頭。
     */
    createEffect(() => {
        const value = props.value

        if (!view || view.state.doc.toString() === value) {
            return
        }

        view.dispatch({
            changes: { from: 0, to: view.state.doc.length, insert: value },
            annotations: syncFromProps.of(true),
        })
    })

    createEffect(() => {
        const marks = props.marks

        view?.dispatch({ effects: setLineMarks.of(marks) })
    })

    createEffect(() => {
        const readOnly = props.readOnly

        view?.dispatch({
            effects: readOnlyCompartment.reconfigure(EditorState.readOnly.of(readOnly)),
        })
    })

    onCleanup(() => {
        view?.destroy()
        view = undefined
    })

    return (
        <div
            ref={element => { host = element }}
            class='min-h-0 flex-1 overflow-hidden rounded-md border border-transparent bg-elevated'
        />
    )
}
