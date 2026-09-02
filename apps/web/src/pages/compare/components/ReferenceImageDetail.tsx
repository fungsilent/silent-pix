import { Line } from '#/components/base/Line'
import { CollapseButton, CollapsedBar, Panel, PanelContent, PanelHeader } from '#/components/base/Panel'
import { DetailRow, DetailSection } from '#/components/detail'
import { Number } from '#/components/field'
import { formatDateTime } from '#/lib/format'

import type { ImageApi } from '@silent-pix/shared'

type ReferenceImageDetailProps = {
    image?: ImageApi.ImageResource | undefined
}

export function ReferenceImageDetail(props: ReferenceImageDetailProps) {
    return (
        <Panel
            classes={{
                root: 'border-l border-line bg-surface max-[980px]:hidden',
                open: 'w-[350px]',
                close: 'w-10',
            }}
        >
            {panel => (
                panel.isCollapsed() ? (
                    <CollapsedBar onClick={panel.toggle} />
                ) : (
                    <div class='flex h-full min-h-0 flex-col'>
                        <PanelHeader
                            title='Detail'
                            action={(
                                <CollapseButton
                                    collapsed={panel.isCollapsed()}
                                    onClick={panel.toggle}
                                />
                            )}
                        />
                        <PanelContent
                            classes={{
                                content: 'gap-3 px-4 pt-0 pb-5',
                            }}
                        >
                            {props.image && <ReferenceImageContent image={props.image} />}
                        </PanelContent>
                    </div>
                )
            )}
        </Panel>
    )
}

type ReferenceImageContentProps = {
    image: ImageApi.ImageResource
}

function ReferenceImageContent(props: ReferenceImageContentProps) {
    return (
        <>
            <DetailSection>
                <DetailRow label='ID'>
                    <span class='block truncate font-mono text-[11px] font-medium leading-none text-fg'>
                        {props.image.id}
                    </span>
                </DetailRow>
                <DetailRow label='Created'>
                    <span class='text-xs leading-none text-fg-secondary'>
                        {formatDateTime(props.image.createdAt)}
                    </span>
                </DetailRow>
            </DetailSection>

            <Line />

            <DetailSection title='IMAGE'>
                <div class='flex h-40 items-center justify-center overflow-hidden rounded-md bg-active'>
                    <img
                        class='max-h-full max-w-full object-contain'
                        src={props.image.url}
                        alt='Selected reference image'
                    />
                </div>
            </DetailSection>

            <Line />

            <DetailSection title='Config'>
                <div class='grid grid-cols-2 gap-2'>
                    <Number
                        label='Width'
                        value={props.image.width}
                        disabled
                    />
                    <Number
                        label='Height'
                        value={props.image.height}
                        disabled
                    />
                </div>
            </DetailSection>
        </>
    )
}

