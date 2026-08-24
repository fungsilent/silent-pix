import { useIsMutating } from '@tanstack/solid-query'
import { Sparkles } from 'lucide-solid'
import { createEffect, createSignal, on } from 'solid-js'

import { Button } from '#/components/base/Button'
import { taskKeys } from '#/features/task/task.key'
import { cn } from '#/lib/cn'
import { IssueChip } from '#/pages/generate/components/workspace/generate/IssueChip'
import { PromptEditor } from '#/pages/generate/components/workspace/generate/prompt/PromptEditor'
import { useOptionIssues } from '#/pages/generate/issue'
import { useGenerateStore } from '#/pages/generate/store'

import type { PromptDocument } from '#/pages/generate/components/workspace/generate/prompt/prompt.document'

/* MARK: PromptPanel */
type PromptKind = 'positive' | 'negative'

const promptLabel: Record<PromptKind, string> = {
    negative: 'Negative',
    positive: 'Positive',
}

export function PromptPanel() {
    const store = useGenerateStore()
    const createTaskCount = useIsMutating(() => ({ mutationKey: taskKeys.create() }))
    const optionIssues = useOptionIssues()
    const [issuesOpen, setIssuesOpen] = createSignal(false)
    const issues = () => [...optionIssues(), ...store.state.submitIssues]
    const [positiveVisible, setPositiveVisible] = createSignal(true)
    const [negativeVisible, setNegativeVisible] = createSignal(true)

    createEffect(on(
        () => store.state.taskId,
        () => {
            setPositiveVisible(true)
            setNegativeVisible(true)
        },
    ))

    /*
     * 只有「剛按下 Generate」才自動展開。常駐來源（選項載入失敗）會讓計數在
     * 使用者什麼都沒做時變動，那時候彈開等於無故打擾。
     */
    createEffect(on(
        () => store.state.submitToken,
        token => {
            if (token > 0) {
                setIssuesOpen(issues().length > 1)
            }
        },
        { defer: true },
    ))

    /* 問題清空時把展開狀態也收掉，否則下次冒出問題會直接彈開 */
    createEffect(() => {
        if (issues().length === 0) {
            setIssuesOpen(false)
        }
    })

    const visible = (kind: PromptKind) => kind === 'positive' ? positiveVisible() : negativeVisible()
    const toggleVisible = (kind: PromptKind) => {
        if (kind === 'positive') {
            setPositiveVisible(value => !value)
            return
        }

        setNegativeVisible(value => !value)
    }

    const openCount = () => (positiveVisible() ? 1 : 0) + (negativeVisible() ? 1 : 0)
    const editorHeight = () => `max(96px, calc((100dvh - 460px) / ${openCount() || 1}))`

    return (
        <section class='flex shrink-0 flex-col overflow-hidden border-b border-line-subtle bg-surface'>
            <div class='flex min-h-12 shrink-0 items-center justify-between gap-3 px-4 py-2'>
                <div class='flex shrink-0 items-center gap-2'>
                    <h2 class='m-0 text-sm font-bold leading-none text-fg'>Prompt</h2>
                    <PromptToggle
                        kind='positive'
                        visible={positiveVisible()}
                        onClick={() => toggleVisible('positive')}
                    />
                    <PromptToggle
                        kind='negative'
                        visible={negativeVisible()}
                        onClick={() => toggleVisible('negative')}
                    />
                </div>

                <div class='flex min-w-0 flex-1 justify-end'>
                    <IssueChip
                        issues={issues()}
                        open={issuesOpen()}
                        onOpenChange={setIssuesOpen}
                    />
                </div>

                <Button
                    type='submit'
                    variant='primary'
                    disabled={createTaskCount() > 0}
                    classes={{
                        root: 'px-4 text-sm font-bold disabled:cursor-not-allowed disabled:opacity-60'
                    }}
                >
                    <Sparkles
                        size={16}
                        strokeWidth={2.2}
                    />
                    {createTaskCount() > 0 ? 'Creating...' : 'Generate'}
                </Button>
            </div>

            <div class='flex flex-col gap-1'>
                <PromptSection
                    kind='positive'
                    visible={visible('positive')}
                    documentKey={`${store.state.taskId}:positive`}
                    initialDocument={store.state.values.positive}
                    height={editorHeight()}
                    onDocumentChange={document => store.setPromptDocument('positive', document)}
                />
                <PromptSection
                    kind='negative'
                    visible={visible('negative')}
                    documentKey={`${store.state.taskId}:negative`}
                    initialDocument={store.state.values.negative}
                    height={editorHeight()}
                    onDocumentChange={document => store.setPromptDocument('negative', document)}
                />
            </div>
        </section>
    )
}

/* MARK: PromptToggle */
type PromptToggleProps = {
    kind: PromptKind
    visible: boolean
    onClick: () => void
}

function PromptToggle(props: PromptToggleProps) {
    return (
        <Button
            variant={props.visible ? 'accent' : 'default'}
            aria-pressed={props.visible}
            classes={{
                root: cn(
                    'gap-1.5 leading-none outline outline-1 outline-offset-0',
                    props.visible
                        ? 'outline-accent/40'
                        : 'text-fg-muted outline-line-subtle hover:text-fg-secondary',
                ),
            }}
            onClick={props.onClick}
        >
            <span
                class='size-[5px] shrink-0 rounded-full bg-current opacity-45'
                aria-hidden='true'
            />
            {promptLabel[props.kind]}
        </Button>
    )
}

/* MARK: PromptSection */
type PromptSectionProps = {
    documentKey: string
    height: string
    initialDocument: PromptDocument
    kind: PromptKind
    visible: boolean
    onDocumentChange: (document: PromptDocument) => void
}

function PromptSection(props: PromptSectionProps) {
    return (
        <section
            class='flex flex-col px-4 pb-2'
            classList={{ hidden: !props.visible }}
        >
            <span class='pb-1.5 text-xs leading-none text-fg-muted'>
                {promptLabel[props.kind]}
            </span>
            <div class='overflow-hidden rounded-md border border-transparent bg-canvas focus-within:border-accent focus-within:ring-3 focus-within:ring-accent/40'>
                <PromptEditor
                    class='scrollbar-thin block w-full'
                    style={{ height: props.height }}
                    documentKey={props.documentKey}
                    initialDocument={props.initialDocument}
                    onDocumentChange={props.onDocumentChange}
                />
            </div>
        </section>
    )
}
