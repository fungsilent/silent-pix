import { Sparkles } from 'lucide-solid'
import { createEffect, createSignal, Show } from 'solid-js'

import { Button } from '#/components/base/Button'
import { cn } from '#/lib/cn'
import { PromptTabs } from '#/pages/generate/components/workspace/PromptTabs'
import { useGenerateStore } from '#/pages/generate/store'

import type { GenerateTask, GenerateValues } from '#/pages/generate/store'

/* MARK: PromptPanel */
type PromptKind = 'positive' | 'negative'

type PromptGroupState = {
    visible: boolean
}

type PromptPanelProps = {
    task: GenerateTask
    isSubmitting?: boolean | undefined
    submitError?: string | undefined
}


const promptLabel: Record<PromptKind, string> = {
    negative: 'Negative',
    positive: 'Positive',
}


export function PromptPanel(props: PromptPanelProps) {
    const store = useGenerateStore()
    const [positive, setPositive] = createSignal<PromptGroupState>({
        visible: true,
    })
    const [negative, setNegative] = createSignal<PromptGroupState>({
        visible: true,
    })
    const [selected, setSelected] = createSignal<Record<PromptKind, string | undefined>>({
        negative: props.task.prompt.negative[0]?.id,
        positive: props.task.prompt.positive[0]?.id,
    })
    const [dragged, setDragged] = createSignal<Record<PromptKind, string | undefined>>({
        negative: undefined,
        positive: undefined,
    })

    createEffect(() => {
        const task = props.task

        setPositive({
            visible: true,
        })
        setNegative({
            visible: true,
        })
        setSelected({
            negative: task.prompt.negative[0]?.id,
            positive: task.prompt.positive[0]?.id,
        })
        setDragged({
            negative: undefined,
            positive: undefined,
        })
    })

    const group = (kind: PromptKind) => kind === 'positive' ? positive() : negative()
    const setGroup = (kind: PromptKind, value: PromptGroupState) => {
        if (kind === 'positive') {
            setPositive(value)
            return
        }

        setNegative(value)
    }
    const tags = (kind: PromptKind) => store.state.values[kind]
    const selectedTag = (kind: PromptKind) => tags(kind).find(tag => tag.id === selected()[kind]) ?? tags(kind)[0]

    const updateTags = (kind: PromptKind, nextTags: GenerateValues[PromptKind]) => {
        store.setValue(kind, nextTags)

        const selectedId = selected()[kind]
        if (!nextTags.some(tag => tag.id === selectedId)) {
            setSelected(value => ({
                ...value,
                [kind]: nextTags[0]?.id,
            }))
        }
    }

    /*
     * Ark 只回傳 label 陣列，所以先用 label 對位（涵蓋新增、刪除、重排），
     * 對不到的再用位置對位——那代表這一格是改名，必須沿用原本的 id 與 text，
     * 否則改名會被當成新分頁，textarea 內容整段消失。
     */
    const syncTagValues = (kind: PromptKind, tagValues: string[]) => {
        const current = tags(kind)
        const taken = new Set<number>()

        const byLabel = tagValues.map(value => {
            const index = current.findIndex((tag, tagIndex) => (
                !taken.has(tagIndex) && tag.label === value
            ))

            if (index < 0) {
                return undefined
            }

            taken.add(index)
            return current[index]
        })

        const nextTags = byLabel.map((tag, index) => {
            const label = tagValues[index] ?? ''
            if (tag) {
                return tag
            }

            const renamed = current[index]
            if (renamed && !taken.has(index)) {
                taken.add(index)
                return { ...renamed, label }
            }

            return {
                id: `${kind}-${crypto.randomUUID()}`,
                label,
                text: '',
            }
        })

        updateTags(kind, nextTags)
    }

    const updateSelectedText = (kind: PromptKind, text: string) => {
        updateTags(kind, tags(kind).map(tag => (
            tag.id === selectedTag(kind)?.id
                ? { ...tag, text }
                : tag
        )))
    }

    const moveTag = (kind: PromptKind, targetId: string) => {
        const sourceId = dragged()[kind]
        if (!sourceId || sourceId === targetId) {
            return
        }

        const current = tags(kind)
        const sourceIndex = current.findIndex(tag => tag.id === sourceId)
        const targetIndex = current.findIndex(tag => tag.id === targetId)
        if (sourceIndex < 0 || targetIndex < 0) {
            return
        }

        const nextTags = [...current]
        const [item] = nextTags.splice(sourceIndex, 1)
        if (!item) {
            return
        }

        nextTags.splice(targetIndex, 0, item)
        updateTags(kind, nextTags)
    }

    const openCount = () => (positive().visible ? 1 : 0) + (negative().visible ? 1 : 0)
    const textAreaMaxHeight = () => `max(56px, calc((100dvh - 460px) / ${openCount() || 1}))`

    const toggleVisible = (kind: PromptKind) => {
        setGroup(kind, {
            visible: !group(kind).visible,
        })
    }

    return (
        <section class='flex shrink-0 flex-col overflow-hidden border-b border-line-subtle bg-surface pb-1'>
            <div class='flex min-h-12 shrink-0 items-center justify-between gap-3 px-4 py-2'>
                <div class='flex min-w-0 items-center gap-2'>
                    <h2 class='m-0 text-sm font-bold leading-none text-fg'>Prompt</h2>
                    <PromptToggle
                        kind='positive'
                        visible={positive().visible}
                        onClick={() => toggleVisible('positive')}
                    />
                    <PromptToggle
                        kind='negative'
                        visible={negative().visible}
                        onClick={() => toggleVisible('negative')}
                    />
                </div>
                <Button
                    type='submit'
                    variant='primary'
                    disabled={props.isSubmitting}
                    classes={{
                        root: 'px-4 text-sm font-bold disabled:cursor-not-allowed disabled:opacity-60'
                    }}
                >
                    <Sparkles
                        size={16}
                        strokeWidth={2.2}
                    />
                    {props.isSubmitting ? 'Creating...' : 'Generate'}
                </Button>
            </div>

            <Show when={props.submitError}>
                <p class='m-0 border-t border-line-subtle px-3 py-2 text-xs text-red-300'>
                    {props.submitError}
                </p>
            </Show>

            <div class='flex flex-col gap-1'>
                <PromptGroup
                    kind='positive'
                    tags={tags('positive')}
                    visible={positive().visible}
                    selectedId={selectedTag('positive')?.id}
                    text={selectedTag('positive')?.text ?? ''}
                    draggedId={dragged().positive}
                    onAddTag={() => syncTagValues('positive', [...tags('positive').map(tag => tag.label), 'New Tag'])}
                    onDragEnd={() => setDragged(value => ({ ...value, positive: undefined }))}
                    onDragStart={tagId => setDragged(value => ({ ...value, positive: tagId }))}
                    onDrop={tagId => moveTag('positive', tagId)}
                    onSelect={tagId => setSelected(value => ({ ...value, positive: tagId }))}
                    textAreaMaxHeight={textAreaMaxHeight()}
                    onTextInput={text => updateSelectedText('positive', text)}
                    onValuesChange={tagValues => syncTagValues('positive', tagValues)}
                />
                <PromptGroup
                    kind='negative'
                    tags={tags('negative')}
                    visible={negative().visible}
                    selectedId={selectedTag('negative')?.id}
                    text={selectedTag('negative')?.text ?? ''}
                    draggedId={dragged().negative}
                    onAddTag={() => syncTagValues('negative', [...tags('negative').map(tag => tag.label), 'New Tag'])}
                    onDragEnd={() => setDragged(value => ({ ...value, negative: undefined }))}
                    onDragStart={tagId => setDragged(value => ({ ...value, negative: tagId }))}
                    onDrop={tagId => moveTag('negative', tagId)}
                    onSelect={tagId => setSelected(value => ({ ...value, negative: tagId }))}
                    textAreaMaxHeight={textAreaMaxHeight()}
                    onTextInput={text => updateSelectedText('negative', text)}
                    onValuesChange={tagValues => syncTagValues('negative', tagValues)}
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
                    'h-7 gap-1.5 px-3 py-0 text-[0.72rem] leading-none outline outline-1 outline-offset-0',
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

/* MARK: PromptGroup */
type PromptGroupProps = {
    draggedId: string | undefined
    kind: PromptKind
    selectedId: string | undefined
    tags: GenerateValues[PromptKind]
    text: string
    textAreaMaxHeight: string
    visible: boolean
    onAddTag: () => void
    onDragEnd: () => void
    onDragStart: (tagId: string) => void
    onDrop: (tagId: string) => void
    onSelect: (tagId: string) => void
    onTextInput: (text: string) => void
    onValuesChange: (values: string[]) => void
}

function PromptGroup(props: PromptGroupProps) {
    return (
        <Show when={props.visible}>
            <section class='flex flex-col px-4 pb-2'>
                <div class='flex min-w-0 items-end gap-2'>
                    <span class='w-[54px] shrink-0 pb-2 text-xs leading-none text-fg-muted'>
                        {promptLabel[props.kind]}
                    </span>
                    <PromptTabs
                        classes={{
                            root: 'flex-1',
                        }}
                        draggedId={props.draggedId}
                        items={props.tags}
                        selectedId={props.selectedId}
                        onDragEnd={props.onDragEnd}
                        onDragStart={props.onDragStart}
                        onDrop={props.onDrop}
                        onSelect={props.onSelect}
                        onValuesChange={props.onValuesChange}
                    />
                </div>
                <div class='rounded-md border border-transparent bg-active px-3 py-2 focus-within:border-accent focus-within:ring-3 focus-within:ring-accent/40'>
                    <textarea
                        class='scrollbar-thin resizer-hidden block h-20 min-h-14 w-full resize-y bg-transparent text-xs leading-5 text-fg outline-none'
                        style={{ 'max-height': props.textAreaMaxHeight }}
                        value={props.text}
                        onInput={event => props.onTextInput(event.currentTarget.value)}
                    />
                </div>
            </section>
        </Show>
    )
}
