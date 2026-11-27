import { ListOrdered, Sparkles } from 'lucide-solid'
import { Show } from 'solid-js'

import { Bar } from '#/components/base/Bar'
import { Button } from '#/components/base/Button'
import { Splitter } from '#/components/base/Splitter'
import { t } from '#/lib/i18n'
import { evenPair, splitPair } from '#/lib/splitter'
import { theme } from '#/lib/theme'
import { promptMinHeight } from '#/pages/generate/components/workspace/generate/prompt/prompt.theme'
import { promptLabel, PromptSection } from '#/pages/generate/components/workspace/generate/PromptSection'
import { useGenerateDetail } from '#/pages/generate/state/detail'
import { useGenerateSession } from '#/pages/generate/state/session'
import { mergeClasses } from '#/utils/style'

import type { PromptKind } from '#/pages/generate/form'

/* MARK: PromptPanel */
export function PromptPanel() {
    const generateSession = useGenerateSession()
    const detail = useGenerateDetail()
    const isSubmitting = generateSession.isSubmitting

    const visible = (kind: PromptKind) => generateSession.state.promptVisible[kind]
    let editors: HTMLElement | undefined
    const startSectionDrag = () => {
        const height = (kind: PromptKind) => renderedPromptHeight(editors, kind) ?? generateSession.state.promptHeight[kind]
        const start = [height('positive'), height('negative')] as const
        return (delta: number) => {
            const [positive, negative] = splitPair(start, delta, promptMinHeight)
            generateSession.setPromptHeight({ positive, negative })
        }
    }
    const equalizeSections = () => {
        const [positive, negative] = evenPair([generateSession.state.promptHeight.positive, generateSession.state.promptHeight.negative])
        generateSession.setPromptHeight({ positive, negative })
    }

    return (
        <section class={mergeClasses(theme.card, 'flex min-h-0 flex-col bg-surface')}>
            <Bar.Root>
                <Bar.Group>
                    <Bar.Title>{t('fields.prompt')}</Bar.Title>
                    <Button
                        variant='ghost'
                        title={t('generate.prompt.gutter')}
                        classes={{ root: mergeClasses('size-7 shrink-0 p-0', generateSession.state.promptGutterVisible && theme.selected) }}
                        onClick={() => generateSession.togglePromptGutter()}
                    >
                        <ListOrdered
                            size={16}
                            strokeWidth={1.8}
                        />
                    </Button>
                    <PromptToggle
                        kind='positive'
                        visible={visible('positive')}
                        onClick={() => generateSession.togglePromptVisible('positive')}
                    />
                    <PromptToggle
                        kind='negative'
                        visible={visible('negative')}
                        onClick={() => generateSession.togglePromptVisible('negative')}
                    />
                </Bar.Group>

                <Bar.Actions>
                    <Button
                        size='bar'
                        type='submit'
                        variant='solid'
                        tone='accent'
                        disabled={isSubmitting() || !detail.editable()}
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
                inert={!detail.editable()}
            >
                <PromptSection
                    kind='positive'
                    loading={detail.loading()}
                    visible={visible('positive')}
                    height={generateSession.state.promptHeight.positive}
                    gutter={generateSession.state.promptGutterVisible}
                    class='pb-2'
                />
                <Show when={visible('positive') && visible('negative')}>
                    <Splitter
                        onDragStart={startSectionDrag}
                        onReset={equalizeSections}
                        classes={{ root: '-mt-2 h-3', line: 'inset-x-4' }}
                    />
                </Show>
                <PromptSection
                    kind='negative'
                    loading={detail.loading()}
                    visible={visible('negative')}
                    height={generateSession.state.promptHeight.negative}
                    gutter={generateSession.state.promptGutterVisible}
                    class='pb-2'
                />
            </div>
        </section>
    )
}

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
