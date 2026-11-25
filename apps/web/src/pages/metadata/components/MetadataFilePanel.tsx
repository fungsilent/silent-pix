import { FolderOpen, X } from 'lucide-solid'
import { Match, Show, Switch } from 'solid-js'

import { Bar } from '#/components/base/Bar'
import { Button } from '#/components/base/Button'
import { Line } from '#/components/base/Line'
import { Loading } from '#/components/base/Loading'
import { DetailRow, DetailSection } from '#/components/detail'
import { localeStore, t } from '#/lib/i18n'
import { theme } from '#/lib/theme'
import { mergeClasses } from '#/utils/style'

import type { ImageMetadata } from '#/pages/metadata/metadata.parse'

const formatLabel: Record<ImageMetadata['mime'], string> = {
    'image/png': 'PNG',
    'image/jpeg': 'JPEG',
    'image/webp': 'WebP',
}

/* MARK: FilePanel */
type FilePanelProps = {
    file: File
    mime: ImageMetadata['mime'] | undefined
    loading: boolean
    previewUrl: string | undefined
    previewFailed: boolean
    dimensions: string | undefined
    onOpen: () => void
    onClear: () => void
    onPreviewLoad: (dimensions: string) => void
    onPreviewError: () => void
}

export function MetadataFilePanel(props: FilePanelProps) {
    const size = () => formatSize(props.file.size, localeStore.state.locale)

    return (
        <aside class={mergeClasses(theme.card, 'flex h-full w-[300px] flex-none flex-col bg-surface')}>
            <Bar.Root classes={{ root: 'px-2' }}>
                <Bar.Title classes={{ root: 'pl-2' }}>{t('metadata.title')}</Bar.Title>
                <Bar.Actions classes={{ root: 'gap-1' }}>
                    <Button
                        variant='ghost'
                        title={t('metadata.openImage')}
                        classes={{ root: 'size-7 shrink-0 p-0 text-fg-muted' }}
                        onClick={() => props.onOpen()}
                    >
                        <FolderOpen
                            size={15}
                            strokeWidth={1.8}
                        />
                    </Button>
                    <Button
                        variant='ghost'
                        classes={{ root: 'size-7 shrink-0 p-0 text-fg-muted' }}
                        onClick={() => props.onClear()}
                    >
                        <X
                            size={15}
                            strokeWidth={1.8}
                        />
                    </Button>
                </Bar.Actions>
            </Bar.Root>
            <div class='scrollbar-thin min-h-0 flex-1 overflow-y-auto'>
                <div class='flex flex-col gap-3 px-4 pb-5'>
                    <Switch>
                        <Match when={props.loading}>
                            <Loading.Skeleton class='h-56 w-full' />
                        </Match>
                        <Match when={props.previewFailed || !props.previewUrl}>
                            <div class='flex h-56 items-center justify-center rounded-md bg-stage'>
                                <span class='text-xs text-fg-muted'>{t('metadata.previewUnavailable')}</span>
                            </div>
                        </Match>
                        <Match when={props.previewUrl}>
                            {url => (
                                <div class='flex h-56 items-center justify-center overflow-hidden rounded-md bg-stage'>
                                    <img
                                        src={url()}
                                        alt={t('metadata.previewAlt')}
                                        class='max-h-full max-w-full object-contain'
                                        onLoad={event => props.onPreviewLoad(`${event.currentTarget.naturalWidth} × ${event.currentTarget.naturalHeight}`)}
                                        onError={() => props.onPreviewError()}
                                    />
                                </div>
                            )}
                        </Match>
                    </Switch>
                    <Line />
                    <DetailSection title={t('metadata.file')}>
                        <DetailRow label={t('metadata.fields.name')}>
                            <span
                                class='block truncate text-xs leading-none text-fg'
                                title={props.file.name}
                            >
                                {props.file.name}
                            </span>
                        </DetailRow>
                        <DetailRow label={t('metadata.fields.format')}>
                            <FileValue loading={props.loading}>
                                {props.mime ? formatLabel[props.mime] : '—'}
                            </FileValue>
                        </DetailRow>
                        <DetailRow label={t('metadata.fields.dimensions')}>
                            <FileValue loading={props.loading}>
                                {props.previewFailed ? '—' : props.dimensions ?? '—'}
                            </FileValue>
                        </DetailRow>
                        <DetailRow label={t('metadata.fields.size')}>
                            <FileValue loading={false}>{size()}</FileValue>
                        </DetailRow>
                    </DetailSection>
                </div>
            </div>
        </aside>
    )
}

type FileValueProps = {
    loading: boolean
    children: string
}

function FileValue(props: FileValueProps) {
    return (
        <Show
            when={!props.loading}
            fallback={<Loading.Skeleton class='h-3 w-2/3' />}
        >
            <span class='block truncate text-xs leading-none text-fg-secondary tabular-nums'>{props.children}</span>
        </Show>
    )
}

function formatSize(bytes: number, locale: string): string {
    if (bytes < 1024) {
        return new Intl.NumberFormat(locale, { style: 'unit', unit: 'byte', unitDisplay: 'narrow' }).format(bytes)
    }
    if (bytes < 1024 * 1024) {
        return new Intl.NumberFormat(locale, { style: 'unit', unit: 'kilobyte', maximumFractionDigits: 0 }).format(bytes / 1024)
    }
    return new Intl.NumberFormat(locale, { style: 'unit', unit: 'megabyte', maximumFractionDigits: 1 }).format(bytes / (1024 * 1024))
}
