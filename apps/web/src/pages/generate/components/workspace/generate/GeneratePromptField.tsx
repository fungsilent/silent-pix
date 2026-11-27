import { PromptEditor } from '#/pages/generate/components/workspace/generate/prompt/PromptEditor'
import { useGenerateSession } from '#/pages/generate/state/session'

import type { PromptKind } from '#/pages/generate/form'

type GeneratePromptFieldProps = {
    kind: PromptKind
    gutter?: boolean | undefined
    class?: string | undefined
}

export function GeneratePromptField(props: GeneratePromptFieldProps) {
    const generateSession = useGenerateSession()
    const form = generateSession.form

    return (
        <form.Field name={props.kind}>
            {field => (
                <PromptEditor
                    class={props.class}
                    gutter={props.gutter}
                    documentKey={`${generateSession.state.formRevision}:${props.kind}`}
                    initialDocument={field().state.value}
                    onDocumentChange={field().handleChange}
                />
            )}
        </form.Field>
    )
}
