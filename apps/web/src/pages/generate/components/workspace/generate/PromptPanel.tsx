import { Sparkles } from 'lucide-solid'
import { createEffect, createSignal, on, Show } from 'solid-js'

import { Bar } from '#/components/base/Bar'
import { Button } from '#/components/base/Button'
import { IssueChip } from '#/components/base/IssueChip'
import { Loading } from '#/components/base/Loading'
import { cn } from '#/lib/cn'
import { promptDefaultHeight, promptMinHeight } from '#/pages/generate/components/workspace/generate/prompt/prompt.theme'
import { PromptEditor } from '#/pages/generate/components/workspace/generate/prompt/PromptEditor'
import { useGenerateDetail } from '#/pages/generate/detail'
import { useRuntimeIssues } from '#/pages/generate/issue.runtime'
import { useGenerateStore } from '#/pages/generate/store'

import type { PromptDocument } from '#/pages/generate/components/workspace/generate/prompt/prompt.document'
import type { PromptKind } from '#/pages/generate/form'
import type { Accessor } from 'solid-js'

/* MARK: PromptPanel */
const promptLabel: Record<PromptKind, string> = {
    negative: 'Negative',
    positive: 'Positive',
}

export function PromptPanel() {
    const store = useGenerateStore()
    const detail = useGenerateDetail()
    const isLoading = detail.loading
    const form = store.form
    const isSubmitting = form.useSelector(state => state.isSubmitting)
    const runtimeIssues = useRuntimeIssues()
    const [issuesOpen, setIssuesOpen] = createSignal(false)
    const issues = () => [...runtimeIssues(), ...store.state.submitIssues]
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

    const visible = (kind: PromptKind) => store.state.promptVisible[kind]
    const openCount = () => (visible('positive') ? 1 : 0) + (visible('negative') ? 1 : 0)
    /*
     * 上限而非固定高度：editor 隨內容長高，超過才捲動。
     * 地板必須等於預設高度，否則視窗矮時上限會低於下限，
     * host 是 overflow: hidden，會直接把 editor 切掉且不出現捲軸。
     */
    const editorMaxHeight = () => (
        `max(${promptDefaultHeight}px, calc((100dvh - 460px) / ${openCount() || 1}))`
    )

    return (
        <section class='flex shrink-0 flex-col overflow-hidden border-b border-line-subtle bg-surface'>
            <Bar.Root>
                <Bar.Group>
                    <Bar.Title>Prompt</Bar.Title>
                    <PromptToggle
                        kind='positive'
                        visible={visible('positive')}
                        onClick={() => store.togglePromptVisible('positive')}
                    />
                    <PromptToggle
                        kind='negative'
                        visible={visible('negative')}
                        onClick={() => store.togglePromptVisible('negative')}
                    />
                </Bar.Group>

                <Bar.Actions>
                    <IssueChip
                        issues={issues()}
                        open={issuesOpen()}
                        onOpenChange={setIssuesOpen}
                    />
                    <Button
                        size='bar'
                        type='submit'
                        variant='primary'
                        disabled={isSubmitting() || isLoading()}
                        classes={{
                            root: 'shrink-0 font-semibold disabled:cursor-not-allowed disabled:opacity-60'
                        }}
                    >
                        <Sparkles
                            size={16}
                            strokeWidth={2.2}
                        />
                        {isSubmitting() ? 'Creating...' : 'Generate'}
                    </Button>
                </Bar.Actions>
            </Bar.Root>

            <div
                class='flex flex-col gap-1'
                inert={isLoading()}
            >
                <form.Field name='positive'>
                    {field => (
                        <PromptSection
                            isLoading={isLoading}
                            kind='positive'
                            visible={visible('positive')}
                            documentKey={`${store.state.taskId}:positive`}
                            initialDocument={field().state.value}
                            maxHeight={editorMaxHeight()}
                            onDocumentChange={field().handleChange}
                        />
                    )}
                </form.Field>
                <form.Field name='negative'>
                    {field => (
                        <PromptSection
                            isLoading={isLoading}
                            kind='negative'
                            visible={visible('negative')}
                            documentKey={`${store.state.taskId}:negative`}
                            initialDocument={field().state.value}
                            maxHeight={editorMaxHeight()}
                            onDocumentChange={field().handleChange}
                        />
                    )}
                </form.Field>
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
            size='bar'
            variant={props.visible ? 'accent' : 'default'}
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
            />
            {promptLabel[props.kind]}
        </Button>
    )
}

/* MARK: PromptSection */
type PromptSectionProps = {
    documentKey: string
    isLoading: Accessor<boolean>
    maxHeight: string
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
            {/* 既有的 editor host 就是 mask anchor，只補 relative */}
            <div class='relative overflow-hidden rounded-md border border-transparent bg-elevated'>
                <PromptEditor
                    class='resizer-hidden block w-full resize-y overflow-hidden'
                    style={{
                        /* 固定預設高度，內容超過就捲動；拖曳可在一行與 max-height 之間調整 */
                        height: `${promptDefaultHeight}px`,
                        'min-height': `${promptMinHeight}px`,
                        'max-height': props.maxHeight,
                    }}
                    documentKey={props.documentKey}
                    initialDocument={props.initialDocument}
                    onDocumentChange={props.onDocumentChange}
                />
                <Show when={props.isLoading()}>
                    <Loading.Skeleton class='absolute inset-0' />
                </Show>
            </div>
        </section>
    )
}
