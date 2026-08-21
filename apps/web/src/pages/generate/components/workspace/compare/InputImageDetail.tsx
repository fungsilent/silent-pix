import { Line } from '#/components/base/Line'
import { CollapseButton, Panel, PanelContent, PanelHeader } from '#/components/base/Panel'
import { SectionTitle } from '#/components/base/SectionTitle'
import { Number } from '#/components/field'

import type { ImageApi } from '@silent-pix/shared'
import type { JSX } from 'solid-js'

type InputImageDetailProps = {
    image?: ImageApi.ImageResource | undefined
}

export function InputImageDetail(props: InputImageDetailProps) {
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
                    <div class='flex h-12 items-center justify-center'>
                        <CollapseButton
                            collapsed={panel.isCollapsed()}
                            onClick={panel.toggle}
                        />
                    </div>
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
                            {props.image && <InputImageContent image={props.image} />}
                        </PanelContent>
                    </div>
                )
            )}
        </Panel>
    )
}

type InputImageContentProps = {
    image: ImageApi.ImageResource
}

function InputImageContent(props: InputImageContentProps) {
    return (
        <>
            <section class='flex flex-col gap-2'>
                <DetailRow label='ID'>
                    <span class='block truncate font-mono text-[11px] font-medium leading-none text-fg'>
                        {props.image.id}
                    </span>
                </DetailRow>
                <DetailRow label='Created'>
                    <span class='text-xs leading-none text-fg-secondary'>
                        {new Date(props.image.createdAt).toLocaleString()}
                    </span>
                </DetailRow>
            </section>

            <Line />

            <section class='flex flex-col gap-2'>
                <div class='flex flex-col gap-1 py-1'>
                    <SectionTitle>IMAGE</SectionTitle>
                </div>
                <div class='flex h-40 items-center justify-center overflow-hidden rounded-md bg-active'>
                    <img
                        class='max-h-full max-w-full object-contain'
                        src={props.image.url}
                        alt='Selected input image'
                    />
                </div>
            </section>

            <Line />

            <section class='flex flex-col gap-3'>
                <div class='flex flex-col gap-1 py-1'>
                    <SectionTitle>Config</SectionTitle>
                </div>
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
            </section>
        </>
    )
}

type DetailRowProps = {
    children: JSX.Element
    label: string
}

function DetailRow(props: DetailRowProps) {
    return (
        <div class='grid min-w-0 grid-cols-[74px_minmax(0,1fr)] items-center gap-3'>
            <span class='text-xs leading-none text-fg-muted'>{props.label}</span>
            <div class='min-w-0'>{props.children}</div>
        </div>
    )
}
