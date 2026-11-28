import { Show } from 'solid-js'

import { Line } from '#/components/base/Line'
import { detailCopySlotClass, DetailCountReserve, detailIdClass, DetailPanel, DetailRow, DetailSection } from '#/components/detail'
import { Number } from '#/components/field'
import { resolveImageUrl } from '#/data/image/image.api'
import { t } from '#/lib/i18n'
import { formatDateTime } from '#/utils/date'

import type { ImageApi } from '@silent-pix/shared'
import type { PanelCollapse } from '#/components/base/Panel'

type ReferenceImageDetailProps = {
    image?: ImageApi.ImageResource | undefined
    collapse: PanelCollapse
    bare?: boolean | undefined
}

export function ReferenceImageDetail(props: ReferenceImageDetailProps) {
    return (
        <Show
            when={!props.bare}
            fallback={props.image && <ReferenceImageContent image={props.image} />}
        >
            <DetailPanel collapse={props.collapse}>
                {props.image && <ReferenceImageContent image={props.image} />}
            </DetailPanel>
        </Show>
    )
}

type ReferenceImageContentProps = {
    image: ImageApi.ImageResource
}

function ReferenceImageContent(props: ReferenceImageContentProps) {
    return (
        <>
            <DetailSection>
                <DetailRow
                    label={t('fields.id')}
                    fit
                >
                    <div class='flex min-w-0 items-center gap-2'>
                        <span class='flex min-w-0 items-center gap-1.5'>
                            <span class={detailIdClass}>
                                {props.image.id}
                            </span>
                            <span class={detailCopySlotClass} />
                        </span>
                        <DetailCountReserve />
                    </div>
                </DetailRow>
                <DetailRow label={t('fields.created')}>
                    <span class='text-xs leading-none text-fg-secondary'>
                        {formatDateTime(props.image.createdAt)}
                    </span>
                </DetailRow>
            </DetailSection>

            <Line />

            <DetailSection title={t('compare.referenceImageTitle')}>
                <div class='flex h-40 items-center justify-center overflow-hidden rounded-md bg-active'>
                    <img
                        class='max-h-full max-w-full object-contain'
                        src={resolveImageUrl(props.image.url)}
                        alt={t('compare.referenceImageAlt')}
                    />
                </div>
            </DetailSection>

            <Line />

            <DetailSection title={t('common.config')}>
                <div class='grid grid-cols-2 gap-2'>
                    <Number
                        label={t('fields.width')}
                        value={props.image.width}
                        disabled
                    />
                    <Number
                        label={t('fields.height')}
                        value={props.image.height}
                        disabled
                    />
                </div>
            </DetailSection>
        </>
    )
}
