import { Sparkles } from 'lucide-solid'
import { createEffect, on, Show } from 'solid-js'

import { Bar } from '#/components/base/Bar'
import { Button } from '#/components/base/Button'
import { Loading } from '#/components/base/Loading'
import { Splitter } from '#/components/base/Splitter'
import { t } from '#/lib/i18n'
import { evenPair, splitPair } from '#/lib/splitter'
import { theme } from '#/lib/theme'
import { promptMinHeight } from '#/pages/generate/components/workspace/generate/prompt/prompt.theme'
import { PromptEditor } from '#/pages/generate/components/workspace/generate/prompt/PromptEditor'
import { useGenerateDetail } from '#/pages/generate/detail'
import { useRuntimeIssues } from '#/pages/generate/issue.runtime'
import { useGenerateSession } from '#/pages/generate/session'
import { issueList, useIssueSource } from '#/store/issue'
import { mergeClasses } from '#/utils/style'

import type { PromptDocument } from '#/pages/generate/components/workspace/generate/prompt/prompt.document'
import type { PromptKind } from '#/pages/generate/form'
import type { Accessor } from 'solid-js'

/* MARK: PromptPanel */
const promptLabel: Record<PromptKind, () => string> = {
    negative: () => t('fields.negative'),
    positive: () => t('fields.positive'),
}

export function PromptPanel() {
    const store = useGenerateSession()
    const detail = useGenerateDetail()
    const isLoading = detail.loading
    const canEdit = () => store.isSelectionLoaded() && !isLoading() && !detail.error()
    const form = store.form
    const isSubmitting = store.isSubmitting
    const runtimeIssues = useRuntimeIssues()
    const issues = () => [...runtimeIssues(), ...store.state.submitIssues]
    useIssueSource(issues)
    /*
     * 只有「剛按下 Generate」才自動展開 Header 的清單。常駐來源（選項載入失敗）會讓計數在
     * 使用者什麼都沒做時變動，那時候彈開等於無故打擾。chip 只顯示數字，所以一則也展開。
     */
    createEffect(on(
        () => store.state.submitToken,
        token => {
            if (token > 0 && issues().length > 0) {
                issueList.setOpen(true)
            }
        },
        { defer: true },
    ))

    const visible = (kind: PromptKind) => store.state.promptVisible[kind]
    /* 兩段之間的拖曳：總高度不變，只改比例；每段至少一行 */
    let editors: HTMLElement | undefined
    const startSectionDrag = () => {
        const height = (kind: PromptKind) => renderedPromptHeight(editors, kind) ?? store.state.promptHeight[kind]
        const start = [height('positive'), height('negative')] as const
        return (delta: number) => {
            const [positive, negative] = splitPair(start, delta, promptMinHeight)
            store.setPromptHeight({ positive, negative })
        }
    }
    const equalizeSections = () => {
        const [positive, negative] = evenPair([store.state.promptHeight.positive, store.state.promptHeight.negative])
        store.setPromptHeight({ positive, negative })
    }

    return (
        <section class={mergeClasses(theme.card, 'flex min-h-0 flex-col bg-surface')}>
            <Bar.Root>
                <Bar.Group>
                    <Bar.Title>{t('fields.prompt')}</Bar.Title>
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
                    <Button
                        size='bar'
                        type='submit'
                        variant='solid'
                        tone='accent'
                        disabled={isSubmitting() || !canEdit()}
                        classes={{
                            root: 'shrink-0 font-semibold'
                        }}
                    >
                        <Sparkles
                            size={16}
                            strokeWidth={2.2}
                        />
                        {isSubmitting() ? t('generate.creating') : t('header.generate')}
                    </Button>
                </Bar.Actions>
            </Bar.Root>

            <div
                ref={element => { editors = element }}
                class='flex min-h-0 flex-col'
                inert={!canEdit()}
            >
                <form.Field name='positive'>
                    {field => (
                        <PromptSection
                            isLoading={isLoading}
                            kind='positive'
                            visible={visible('positive')}
                            documentKey={`${store.state.formRevision}:positive`}
                            initialDocument={field().state.value}
                            height={store.state.promptHeight.positive}
                            onDocumentChange={field().handleChange}
                        />
                    )}
                </form.Field>
                <Show when={visible('positive') && visible('negative')}>
                    <Splitter
                        onDragStart={startSectionDrag}
                        onReset={equalizeSections}
                        classes={{ root: '-mt-2 h-3', line: 'inset-x-4' }}
                    />
                </Show>
                <form.Field name='negative'>
                    {field => (
                        <PromptSection
                            isLoading={isLoading}
                            kind='negative'
                            visible={visible('negative')}
                            documentKey={`${store.state.formRevision}:negative`}
                            initialDocument={field().state.value}
                            height={store.state.promptHeight.negative}
                            onDocumentChange={field().handleChange}
                        />
                    )}
                </form.Field>
            </div>
        </section>
    )
}

/* 視窗變矮時 editor 會被壓縮到小於儲存值，拖曳要從畫面上的實際高度開始；量不到（未顯示）時回傳 undefined */
export function renderedPromptHeight(root: ParentNode | undefined, kind: PromptKind): number | undefined {
    const element = root?.querySelector<HTMLElement>(`[data-prompt-editor="${kind}"]`)
    return element && element.offsetHeight > 0 ? element.offsetHeight : undefined
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
            tone={props.visible ? 'accent' : 'neutral'}
            classes={{
                root: mergeClasses(
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
            {promptLabel[props.kind]()}
        </Button>
    )
}

/* MARK: PromptSection */
type PromptSectionProps = {
    documentKey: string
    isLoading: Accessor<boolean>
    height: number
    initialDocument: PromptDocument
    kind: PromptKind
    visible: boolean
    onDocumentChange: (document: PromptDocument) => void
}

function PromptSection(props: PromptSectionProps) {
    return (
        <section
            class='flex min-h-0 flex-col px-4 pb-2'
            classList={{ hidden: !props.visible }}
        >
            <span class='pb-1.5 text-xs leading-none text-fg-muted'>
                {promptLabel[props.kind]()}
            </span>
            <div
                data-prompt-editor={props.kind}
                class='relative flex flex-col overflow-hidden rounded-md border border-transparent bg-elevated'
                style={{ flex: `0 1 ${props.height}px`, 'min-height': `${promptMinHeight}px` }}
            >
                <PromptEditor
                    class='block min-h-0 w-full flex-1 overflow-hidden'
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
