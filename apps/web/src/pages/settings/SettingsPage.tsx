import { useQueryClient } from '@tanstack/solid-query'
import { createSignal, Show } from 'solid-js'

import { probeConnection } from '#/api/connection'
import { Bar } from '#/components/base/Bar'
import { Button } from '#/components/base/Button'
import { Dialog } from '#/components/base/Dialog'
import { Text } from '#/components/field'
import { cn } from '#/lib/cn'
import { getPlatform, saveLocalServerUrl, validateLocalServerUrl } from '#/lib/platform'
import { theme } from '#/lib/theme'
import { devStore } from '#/store/dev'

import type { LocalServerUrl } from '#/lib/platform'
import type { DevMode } from '#/store/dev'
import type { Accessor, JSX } from 'solid-js'

type ConnectionStatus = 'connected' | 'failed'

export function SettingsPage() {
    const queryClient = useQueryClient()
    const platform = getPlatform()
    const [serverUrlInput, setServerUrlInput] = createSignal(platform.endpoint ?? '')
    const [connectionStatus, setConnectionStatus] = createSignal<ConnectionStatus>()
    const [testing, setTesting] = createSignal(false)
    const [saving, setSaving] = createSignal(false)
    const [error, setError] = createSignal<string>()
    const [pendingServerUrl, setPendingServerUrl] = createSignal<LocalServerUrl>()

    const testConnection = async () => {
        setError(undefined)
        setConnectionStatus(undefined)

        let nextServerUrl: LocalServerUrl
        try {
            nextServerUrl = validateLocalServerUrl(serverUrlInput())
        }
        catch (value) {
            setError(value instanceof Error ? value.message : 'Enter a valid local Server URL.')
            return
        }

        setTesting(true)
        try {
            await probeConnection(nextServerUrl)
            if (serverUrlInput().trim() === nextServerUrl) {
                setConnectionStatus('connected')
            }
        }
        catch {
            if (serverUrlInput().trim() === nextServerUrl) {
                setConnectionStatus('failed')
            }
        }
        finally {
            setTesting(false)
        }
    }

    const persistServerUrl = async (nextServerUrl: LocalServerUrl) => {
        if (queryClient.isMutating() > 0) {
            setPendingServerUrl(undefined)
            setError('Wait for the current action to finish before changing Servers.')
            setSaving(false)
            return
        }

        setSaving(true)
        setError(undefined)
        try {
            await saveLocalServerUrl(nextServerUrl)
            window.location.reload()
        }
        catch (value) {
            setPendingServerUrl(undefined)
            setError(value instanceof Error ? value.message : 'Could not save Desktop settings.')
            setSaving(false)
        }
    }

    const saveConnection = async () => {
        let nextServerUrl: LocalServerUrl
        try {
            nextServerUrl = validateLocalServerUrl(serverUrlInput())
        }
        catch (value) {
            setError(value instanceof Error ? value.message : 'Enter a valid local Server URL.')
            return
        }

        if (queryClient.isMutating() > 0) {
            setError('Wait for the current action to finish before changing Servers.')
            return
        }

        if (platform.endpoint && platform.endpoint !== nextServerUrl) {
            setPendingServerUrl(nextServerUrl)
            return
        }

        await persistServerUrl(nextServerUrl)
    }

    return (
        <section class='flex min-h-0 flex-1 flex-col'>
            <Bar.Root classes={{ root: 'shrink-0 border-b border-line-subtle' }}>
                <Bar.Group>
                    <Bar.Title>Settings</Bar.Title>
                </Bar.Group>
            </Bar.Root>

            <div class='scrollbar-thin min-h-0 flex-1 overflow-y-auto px-4 py-[18px]'>
                <div class='mx-auto flex w-full max-w-[520px] flex-col gap-3.5'>
                    <DevSettings
                        mode={() => devStore.state.mode}
                        loadingPreview={() => devStore.state.loadingPreview}
                        onModeChange={devStore.setMode}
                        onLoadingPreviewChange={devStore.setLoadingPreview}
                    />
                    {platform.kind === 'desktop' && (
                        <ConnectionSettings
                            value={serverUrlInput}
                            connectionStatus={connectionStatus}
                            testing={testing}
                            saving={saving}
                            error={error}
                            settingsError={platform.settingsError}
                            hasSavedServerUrl={Boolean(platform.endpoint)}
                            onValueChange={value => {
                                setServerUrlInput(value)
                                setConnectionStatus(undefined)
                                setError(undefined)
                            }}
                            onTest={() => void testConnection()}
                            onSave={() => void saveConnection()}
                            onRetrySettings={() => window.location.reload()}
                        />
                    )}
                </div>
            </div>
            <ServerSaveDialog
                nextServerUrl={pendingServerUrl()}
                saving={saving()}
                onCancel={() => setPendingServerUrl(undefined)}
                onConfirm={nextServerUrl => void persistServerUrl(nextServerUrl)}
            />
        </section>
    )
}

type ServerSaveDialogProps = {
    nextServerUrl: LocalServerUrl | undefined
    saving: boolean
    onCancel: () => void
    onConfirm: (nextServerUrl: LocalServerUrl) => void
}

function ServerSaveDialog(props: ServerSaveDialogProps) {
    return (
        <Dialog
            open={props.nextServerUrl !== undefined}
            title='Save Server and reload?'
            description='Saving this Server reloads the app and clears the current page state.'
            onOpenChange={open => {
                if (!open && !props.saving) {
                    props.onCancel()
                }
            }}
            footer={(
                <div class='flex w-full justify-end gap-2'>
                    <Button
                        variant='soft'
                        tone='neutral'
                        disabled={props.saving}
                        onClick={props.onCancel}
                    >
                        Cancel
                    </Button>
                    <Button
                        variant='solid'
                        tone='accent'
                        disabled={props.saving || props.nextServerUrl === undefined}
                        onClick={() => {
                            if (props.nextServerUrl) {
                                props.onConfirm(props.nextServerUrl)
                            }
                        }}
                    >
                        {props.saving ? 'Saving...' : 'Save and reload'}
                    </Button>
                </div>
            )}
        >
            <Show when={props.nextServerUrl}>
                {nextServerUrl => (
                    <p class='m-0 break-all font-mono text-xs text-fg-secondary'>{nextServerUrl()}</p>
                )}
            </Show>
        </Dialog>
    )
}

type ConnectionSettingsProps = {
    value: Accessor<string>
    connectionStatus: Accessor<ConnectionStatus | undefined>
    testing: Accessor<boolean>
    saving: Accessor<boolean>
    error: Accessor<string | undefined>
    settingsError: string | undefined
    hasSavedServerUrl: boolean
    onValueChange: (value: string) => void
    onTest: () => void
    onSave: () => void
    onRetrySettings: () => void
}

function ConnectionSettings(props: ConnectionSettingsProps) {
    return (
        <SettingCard
            title='Connection'
            tag='Desktop'
            description='REST, WebSocket, and image requests all use this URL. Saving reloads the app.'
        >
            <Show when={props.settingsError}>
                {message => (
                    <div class='flex flex-col gap-2 border-t border-line-subtle px-3.5 py-3'>
                        <p class='m-0 flex items-center gap-1.5 text-xs text-danger-fg'>
                            <span class='size-1.5 shrink-0 rounded-full bg-danger' />
                            Could not read Desktop settings: {message()}
                        </p>
                        <Button
                            variant='ghost'
                            classes={{ root: 'self-start px-2 text-xs' }}
                            onClick={props.onRetrySettings}
                        >
                            Retry reading settings
                        </Button>
                    </div>
                )}
            </Show>
            <div class='flex flex-col gap-2 border-t border-line-subtle px-3.5 py-3'>
                <Text
                    label='Local Server URL'
                    value={props.value()}
                    placeholder='http://127.0.0.1:3070'
                    onInput={props.onValueChange}
                />
                <p class='m-0 text-[11px] leading-4 text-fg-muted'>Use http://127.0.0.1:&lt;port&gt;. Saving reloads the app.</p>
                <div class='flex flex-wrap items-center gap-2'>
                    <Button
                        variant='soft'
                        tone='neutral'
                        disabled={props.testing() || props.saving() || props.value().trim() === ''}
                        onClick={props.onTest}
                    >
                        {props.testing() ? 'Testing…' : 'Test connection'}
                    </Button>
                    <Button
                        disabled={props.saving() || props.testing() || props.value().trim() === ''}
                        variant='solid'
                        tone='accent'
                        onClick={props.onSave}
                    >
                        {props.saving() ? 'Saving…' : props.hasSavedServerUrl ? 'Save and reload' : 'Save and connect'}
                    </Button>
                    <ConnectionState status={props.connectionStatus()} />
                </div>
                <Show when={props.error()}>
                    {message => (
                        <p class='m-0 flex items-center gap-1.5 text-xs text-danger-fg'>
                            <span class='size-1.5 shrink-0 rounded-full bg-danger' />
                            {message()}
                        </p>
                    )}
                </Show>
            </div>
        </SettingCard>
    )
}

function ConnectionState(props: { status: ConnectionStatus | undefined }) {
    return (
        <Show when={props.status}>
            {status => {
                const connected = status() === 'connected'
                return (
                    <span class={cn('flex items-center gap-1.5 text-[11px]', connected ? 'text-success-fg' : 'text-danger-fg')}>
                        <span class={cn('size-1.5 shrink-0 rounded-full', connected ? 'bg-success' : 'bg-danger')} />
                        {connected ? 'Connected' : 'Connection check failed'}
                    </span>
                )
            }}
        </Show>
    )
}

/* MARK: SettingCard */

type SettingCardProps = {
    title: string
    tag?: string
    description: string
    children: JSX.Element
}

function SettingCard(props: SettingCardProps) {
    return (
        <section class='overflow-hidden rounded-lg border border-line-subtle bg-surface'>
            <div class='flex flex-col gap-[3px] px-3.5 py-3'>
                <div class='flex items-center gap-2'>
                    <h3 class='m-0 text-[13px] font-semibold leading-none text-fg'>{props.title}</h3>
                    <Show when={props.tag}>
                        {tag => (
                            <span class='rounded bg-elevated px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-[0.04em] text-fg-muted'>
                                {tag()}
                            </span>
                        )}
                    </Show>
                </div>
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
            <div class='flex min-w-0 flex-col gap-[3px]'>
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
            description='Preview loading states for this session only. Real requests are untouched.'
        >
            <SettingRow
                label='Mode'
                hint='Dev reveals the preview controls. Reloading returns to Normal.'
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
                    hint='Show the existing loading skeletons.'
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
