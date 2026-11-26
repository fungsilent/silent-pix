import { Checkbox } from '@ark-ui/solid'
import { Check } from 'lucide-solid'

import { Button } from '#/components/base/Button'
import { t } from '#/lib/i18n'
import { createLocalReferenceImage, isGenerateImageSize } from '#/pages/generate/form'
import { useGenerateSession } from '#/pages/generate/state/session'
import { copyFromGraph, toGenerateDraft } from '#/pages/metadata/metadata.mapping'
import { useMetadataSession } from '#/pages/metadata/state/session'
import { useNavigateToRoute } from '#/routes'

/* 結果區工具列的 Use image as reference 與 Copy to Generate；需要 Generate，只在有 Server 時渲染 */
export function MetadataCopyTo() {
    const session = useMetadataSession()
    const generateSession = useGenerateSession()
    const navigate = useNavigateToRoute()

    const apiEntry = () => session.state.result?.entries.find(entry => entry.kind === 'prompt' && entry.format === 'api-graph')
    const copyDisabledReason = () => apiEntry() ? undefined : t('metadata.copyTo.unsupported')
    const referenceDisabledReason = () => {
        const graphMissing = copyDisabledReason()
        if (graphMissing) return graphMissing
        if (session.state.previewFailed) return t('metadata.previewUnavailable')

        const size = session.state.previewSize
        if (!size) return t('metadata.copyTo.preparingImage')
        if (!isGenerateImageSize(size.width, size.height)) return t('metadata.copyTo.imageSize')
    }
    /* 停用時視為未勾 */
    const useImageAsReference = () => session.state.useImageAsReference && referenceDisabledReason() === undefined

    const copyTo = () => {
        const entry = apiEntry()
        const file = session.state.file
        if (!entry || !file) return

        const size = session.state.previewSize
        const reference = size && useImageAsReference()
            ? createLocalReferenceImage(file, size.width, size.height)
            : undefined
        const { values, defaults } = toGenerateDraft(copyFromGraph(entry), reference)
        generateSession.requestDraft(values, { kind: 'metadata', fileName: file.name, defaults })
        navigate('generate')
    }

    return (
        <>
            <span title={referenceDisabledReason()}>
                <Checkbox.Root
                    checked={useImageAsReference()}
                    disabled={referenceDisabledReason() !== undefined}
                    class='flex h-7 shrink-0 items-center gap-1.5 rounded-md px-1.5 text-xs text-fg-secondary focus-within:ring-2 focus-within:ring-accent/40 hover:text-fg data-disabled:pointer-events-none data-disabled:text-fg-muted data-disabled:opacity-60'
                    onCheckedChange={({ checked }) => session.setUseImageAsReference(checked === true)}
                >
                    <Checkbox.Control class='grid size-3.5 shrink-0 place-items-center rounded-[3px] border border-line bg-surface data-[state=checked]:border-accent data-[state=checked]:bg-accent data-[state=checked]:text-on-stage'>
                        <Checkbox.Indicator>
                            <Check
                                size={10}
                                strokeWidth={3.5}
                            />
                        </Checkbox.Indicator>
                    </Checkbox.Control>
                    <Checkbox.Label>{t('metadata.copyTo.useReference')}</Checkbox.Label>
                    <Checkbox.HiddenInput />
                </Checkbox.Root>
            </span>
            <span title={copyDisabledReason()}>
                <Button
                    size='bar'
                    variant='ghost'
                    disabled={copyDisabledReason() !== undefined}
                    classes={{ root: 'h-7 px-2.5 text-xs font-medium text-fg-secondary hover:text-fg disabled:pointer-events-none' }}
                    onClick={copyTo}
                >
                    {t('metadata.copyTo.generate')}
                </Button>
            </span>
        </>
    )
}
