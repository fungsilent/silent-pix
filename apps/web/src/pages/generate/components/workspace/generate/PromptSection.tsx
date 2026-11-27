import { Show } from 'solid-js'

import { Loading } from '#/components/base/Loading'
import { t } from '#/lib/i18n'
import { GeneratePromptField } from '#/pages/generate/components/workspace/generate/GeneratePromptField'
import { promptMinHeight } from '#/pages/generate/components/workspace/generate/prompt/prompt.theme'
import { mergeClasses } from '#/utils/style'

import type { PromptKind } from '#/pages/generate/form'

export const promptLabel: Record<PromptKind, () => string> = {
    negative: () => t('fields.negative'),
    positive: () => t('fields.positive'),
}

type PromptSectionProps = {
    kind: PromptKind
    gutter: boolean
    loading: boolean
    height?: number | undefined
    visible?: boolean | undefined
    class?: string | undefined
}

export function PromptSection(props: PromptSectionProps) {
    const fixed = () => props.height !== undefined

    return (
        <section
            class={mergeClasses('flex min-h-0 flex-col px-4', props.class)}
            classList={{ hidden: props.visible === false }}
        >
            <span class='pb-1.5 text-xs leading-none text-fg-muted'>
                {promptLabel[props.kind]()}
            </span>
            <div
                data-prompt-editor={props.kind}
                class='relative flex flex-col overflow-hidden rounded-md border border-transparent bg-elevated'
                style={fixed() ? { flex: `0 1 ${props.height}px`, 'min-height': `${promptMinHeight}px` } : undefined}
            >
                <GeneratePromptField
                    kind={props.kind}
                    gutter={props.gutter}
                    class={fixed() ? 'block min-h-0 w-full flex-1 overflow-hidden' : 'block w-full'}
                />
                <Show when={props.loading}>
                    <Loading.Skeleton class='absolute inset-0' />
                </Show>
            </div>
        </section>
    )
}
