import { Show } from 'solid-js'

import { Bar } from '#/components/base/Bar'
import { Button } from '#/components/base/Button'
import { cn } from '#/lib/cn'
import { theme } from '#/lib/theme'
import { devStore } from '#/store/dev'

import type { DevMode } from '#/store/dev'
import type { Accessor, JSX } from 'solid-js'

export function SettingsPage() {
    return (
        <section class='flex h-[calc(100dvh-48px)] flex-col'>
            <Bar.Root classes={{ root: 'shrink-0 border-b border-line-subtle' }}>
                <Bar.Group>
                    <Bar.Title>Settings</Bar.Title>
                </Bar.Group>
            </Bar.Root>

            <div class='scrollbar-thin min-h-0 flex-1 overflow-y-auto px-4 py-5'>
                <div class='mx-auto flex w-full max-w-lg flex-col gap-3.5'>
                    <DevSettings
                        mode={() => devStore.state.mode}
                        loadingPreview={() => devStore.state.loadingPreview}
                        onModeChange={devStore.setMode}
                        onLoadingPreviewChange={devStore.setLoadingPreview}
                    />
                </div>
            </div>
        </section>
    )
}

/* MARK: SettingCard */

type SettingCardProps = {
    title: string
    description: string
    children: JSX.Element
}

function SettingCard(props: SettingCardProps) {
    return (
        <section class='overflow-hidden rounded-lg border border-line-subtle bg-surface'>
            <div class='flex flex-col gap-1 px-3.5 py-3'>
                <h3 class='m-0 text-[13px] font-semibold leading-none text-fg'>{props.title}</h3>
                <p class='m-0 text-[11.5px] leading-4 text-fg-muted'>{props.description}</p>
            </div>
            {props.children}
        </section>
    )
}

/* MARK: SettingRow */

type SettingRowProps = {
    label: string
    hint: string
    children: JSX.Element
}

function SettingRow(props: SettingRowProps) {
    return (
        <div class='flex min-h-14 items-center justify-between gap-4 border-t border-line-subtle px-3.5 py-2.5'>
            <div class='flex min-w-0 flex-col gap-1'>
                <span class='text-[12.5px] leading-none text-fg-secondary'>{props.label}</span>
                <span class='text-[11px] leading-4 text-fg-muted'>{props.hint}</span>
            </div>
            {props.children}
        </div>
    )
}

/* MARK: SettingSegment */

type SettingSegmentOption<Value extends string> = {
    value: Value
    label: string
}

type SettingSegmentProps<Value extends string> = {
    value: Value
    options: readonly SettingSegmentOption<Value>[]
    onChange: (value: Value) => void
}

function SettingSegment<Value extends string>(props: SettingSegmentProps<Value>) {
    return (
        <div class='flex h-[30px] shrink-0 items-center gap-0.5 rounded-md border border-line-subtle bg-elevated p-0.5'>
            {props.options.map(option => (
                <Button
                    variant='ghost'
                    classes={{
                        root: cn(
                            'h-6 min-w-[50px] rounded px-2.5 py-0 text-[11.5px] font-medium',
                            props.value === option.value ? theme.selected : 'text-fg-muted',
                        ),
                    }}
                    onClick={() => props.onChange(option.value)}
                >
                    {option.label}
                </Button>
            ))}
        </div>
    )
}

/* MARK: DevSettings */

type DevSettingsProps = {
    mode: Accessor<DevMode>
    loadingPreview: Accessor<boolean>
    onModeChange: (mode: DevMode) => void
    onLoadingPreviewChange: (loadingPreview: boolean) => void
}

const modeOptions = [
    { value: 'normal', label: 'Normal' },
    { value: 'dev', label: 'Dev' },
] as const satisfies readonly SettingSegmentOption<DevMode>[]

const previewOptions = [
    { value: 'off', label: 'Off' },
    { value: 'on', label: 'On' },
] as const

function DevSettings(props: DevSettingsProps) {
    return (
        <SettingCard
            title='Dev Settings'
            description='在目前這次執行預覽 loading 外觀，不影響真實請求。'
        >
            <SettingRow
                label='Mode'
                hint='Dev 才會顯示預覽控制；重新載入回到 Normal。'
            >
                <SettingSegment
                    value={props.mode()}
                    options={modeOptions}
                    onChange={props.onModeChange}
                />
            </SettingRow>

            <Show when={props.mode() === 'dev'}>
                <SettingRow
                    label='Loading preview'
                    hint='顯示既有的 loading skeleton。'
                >
                    <SettingSegment
                        value={props.loadingPreview() ? 'on' : 'off'}
                        options={previewOptions}
                        onChange={value => props.onLoadingPreviewChange(value === 'on')}
                    />
                </SettingRow>
            </Show>
        </SettingCard>
    )
}
