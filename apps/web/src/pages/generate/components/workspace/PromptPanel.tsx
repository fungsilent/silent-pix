import { clsx } from 'clsx'
import { Sparkles } from 'lucide-solid'
import { createEffect, createSignal, Show } from 'solid-js'

import { Button } from '#/components/base/Button'
import { Tag } from '#/components/field'
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

    const syncTagValues = (kind: PromptKind, tagValues: string[]) => {
        const current = tags(kind)
        const nextTags = tagValues.map(value => {
            const existing = current.find(tag => tag.label === value)
            return existing ?? {
                id: `${kind}-${crypto.randomUUID()}`,
                label: value,
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

    const toggleVisible = (kind: PromptKind) => {
        setGroup(kind, {
            visible: !group(kind).visible,
        })
    }

    const hasPrompt = () => positive().visible || negative().visible

    return (
        <section class='overflow-hidden rounded-md border border-line-subtle bg-surface'>
            <div class='flex min-h-12 items-center justify-between gap-3 px-3 py-2'>
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
                    disabled={props.isSubmitting}
                    classes={{
                        root: clsx(
                            'inline-flex gap-2 rounded-md border-transparent bg-accent px-4 font-bold text-white text-sm hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-60'
                        )
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

            {hasPrompt() && (
                <div class={clsx('border-b border-line-subtle')}/>
            )}

            <div class='flex flex-col'>
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
            classes={{
                root: clsx(
                    'h-7 rounded px-3 text-[0.72rem] font-bold leading-none outline outline-1 outline-offset-0',
                    props.visible
                        ? 'bg-accent/15 text-accent-fg outline-accent/40'
                        : 'bg-elevated text-fg-muted outline-line-subtle',
                )
            }}
            onClick={props.onClick}
        >
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
            <section class='overflow-hidden'>
                <div class='flex min-h-10 items-center gap-2 px-2 py-2'>
                    <span class='w-14 shrink-0 text-xs font-bold text-fg'>{promptLabel[props.kind]}</span>
                    <Tag
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
                <textarea
                    class='block min-h-14 w-full resize-y bg-active px-3 py-2 text-xs font-semibold leading-5 text-fg outline-none focus:border-accent'
                    value={props.text}
                    onInput={event => props.onTextInput(event.currentTarget.value)}
                />
            </section>
        </Show>
    )
}
