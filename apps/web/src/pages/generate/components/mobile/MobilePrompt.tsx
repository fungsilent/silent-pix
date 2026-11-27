import { ListOrdered } from 'lucide-solid'

import { Button } from '#/components/base/Button'
import { DetailTitle } from '#/components/detail/DetailTitle'
import { t } from '#/lib/i18n'
import { theme } from '#/lib/theme'
import { PromptSection } from '#/pages/generate/components/workspace/generate/PromptSection'
import { useGenerateDetail } from '#/pages/generate/state/detail'
import { useGenerateSession } from '#/pages/generate/state/session'
import { mergeClasses } from '#/utils/style'

export function MobilePrompt() {
    const generateSession = useGenerateSession()
    const detail = useGenerateDetail()
    const gutter = () => generateSession.state.promptGutterVisible

    return (
        <section class='flex flex-col pb-2'>
            <div class='flex h-11 shrink-0 items-center px-4'>
                <DetailTitle>{t('fields.prompt')}</DetailTitle>
                <Button
                    variant='ghost'
                    title={t('generate.prompt.gutter')}
                    classes={{ root: mergeClasses('ml-1.5 size-7 p-0', gutter() && theme.selected) }}
                    onClick={() => generateSession.togglePromptGutter()}
                >
                    <ListOrdered
                        size={16}
                        strokeWidth={1.8}
                    />
                </Button>
            </div>
            <div
                class='flex flex-col'
                inert={!detail.editable()}
            >
                <PromptSection
                    kind='positive'
                    gutter={gutter()}
                    loading={detail.loading()}
                    class='pb-3'
                />
                <PromptSection
                    kind='negative'
                    gutter={gutter()}
                    loading={detail.loading()}
                    class='pb-3'
                />
            </div>
        </section>
    )
}
