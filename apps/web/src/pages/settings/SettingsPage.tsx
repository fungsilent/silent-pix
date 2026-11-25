import { useQueryClient } from '@tanstack/solid-query'
import { createSignal, Show } from 'solid-js'

import { Button } from '#/components/base/Button'
import { Dialog } from '#/components/base/Dialog'
import { FieldHint } from '#/components/base/FieldHint'
import { Line } from '#/components/base/Line'
import { SegmentGroup } from '#/components/base/SegmentGroup'
import { StatusMessage } from '#/components/base/StatusMessage'
import { DetailSection } from '#/components/detail'
import { Select, Text } from '#/components/field'
import { probeConnection } from '#/data/app/app.api'
import { localeStore, t } from '#/lib/i18n'
import { getPlatform, saveLocalServerUrl, validateLocalServerUrl } from '#/lib/platform'
import { theme } from '#/lib/theme'
import { routePaths } from '#/routes'
import { devStore } from '#/store/dev'
import { useIssueSource } from '#/store/issue'
import { themeStore } from '#/store/theme'
import { mergeClasses } from '#/utils/style'

import type { SegmentGroupOption } from '#/components/base/SegmentGroup'
import type { LocalServerUrl } from '#/lib/platform'
import type { DevMode } from '#/store/dev'
import type { Theme } from '#/store/theme'
import type { Accessor, JSX } from 'solid-js'

type ConnectionStatus = 'connected' | 'failed'

const languageOptions = [
    { value: 'en', label: 'English' },
    { value: 'zh-TW', label: '繁體中文' },
]

const themeOptions = [
    { value: 'dark', label: () => t('settings.themeDark') },
    { value: 'light', label: () => t('settings.themeLight') },
] as const satisfies readonly SegmentGroupOption<Theme>[]

export function SettingsPage() {
    const queryClient = useQueryClient()
    const platform = getPlatform()
    const [serverUrlInput, setServerUrlInput] = createSignal(platform.endpoint ?? '')
    const [connectionStatus, setConnectionStatus] = createSignal<ConnectionStatus>()
    const [testing, setTesting] = createSignal(false)
    const [saving, setSaving] = createSignal(false)
    /* 欄位錯誤留在欄位下；儲存這類操作失敗進 Header 的 Issue chip */
    const [urlError, setUrlError] = createSignal<() => string>()
    const [actionError, setActionError] = createSignal<() => string>()
    useIssueSource(() => {
        const message = actionError()
        return message
            ? [{ id: 'settings-connection', tone: 'error', field: () => t('settings.connection'), message, onDismiss: () => setActionError() }]
            : []
    })
    const [pendingServerUrl, setPendingServerUrl] = createSignal<LocalServerUrl>()

    const testConnection = async () => {
        setUrlError(undefined)
        setActionError(undefined)
        setConnectionStatus(undefined)

        let nextServerUrl: LocalServerUrl
        try {
            nextServerUrl = validateLocalServerUrl(serverUrlInput())
        }
        catch (value) {
            setUrlError(() => () => value instanceof Error ? value.message : t('settings.invalidLocalServerUrl'))
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
            setActionError(() => () => t('settings.waitForCurrentAction'))
            setSaving(false)
            return
        }

        setSaving(true)
        setActionError(undefined)
        try {
            await saveLocalServerUrl(nextServerUrl)
            // 先更新 Desktop 路由，再重新初始化 Server 連線。
            window.history.replaceState(window.history.state, '', `#${routePaths.generate}`)
            window.location.reload()
        }
        catch (value) {
            setPendingServerUrl(undefined)
            setActionError(() => () => value instanceof Error ? value.message : t('settings.saveSettingsFailed'))
            setSaving(false)
        }
    }

    const saveConnection = async () => {
        let nextServerUrl: LocalServerUrl
        try {
            nextServerUrl = validateLocalServerUrl(serverUrlInput())
        }
        catch (value) {
            setUrlError(() => () => value instanceof Error ? value.message : t('settings.invalidLocalServerUrl'))
            return
        }

        if (queryClient.isMutating() > 0) {
            setActionError(() => () => t('settings.waitForCurrentAction'))
            return
        }

        if (platform.endpoint && platform.endpoint !== nextServerUrl) {
            setPendingServerUrl(nextServerUrl)
            return
        }

        await persistServerUrl(nextServerUrl)
    }

    return (
        <section class={mergeClasses(theme.card, 'flex min-h-0 flex-1 flex-col')}>
            <div class='scrollbar-thin min-h-0 flex-1 overflow-y-auto bg-surface px-4 pt-6 pb-5'>
                <div class='mx-auto flex w-full max-w-[640px] flex-col gap-3'>
                    <h2 class='m-0 mb-2 text-base font-semibold leading-6 text-fg'>{t('common.settings')}</h2>
                    <DetailSection title={t('settings.appearance')}>
                        <Select
                            label={t('settings.language')}
                            options={languageOptions}
                            value={localeStore.state.locale}
                            onChange={localeStore.setLocale}
                            classes={{ root: 'flex-row items-center justify-between gap-4', trigger: 'w-[200px]' }}
                        />
                        <SettingRow
                            label={t('settings.theme')}
                            hint={t('settings.themeHint')}
                        >
                            <SegmentGroup
                                value={themeStore.state.theme}
                                options={themeOptions}
                                onChange={themeStore.setTheme}
                            />
                        </SettingRow>
                    </DetailSection>
                    {platform.kind === 'desktop' && (<>
                        <Line />
                        <ConnectionSettings
                            value={serverUrlInput}
                            connectionStatus={connectionStatus}
                            testing={testing}
                            saving={saving}
                            urlError={() => urlError()?.()}
                            settingsError={platform.settingsError}
                            hasSavedServerUrl={Boolean(platform.endpoint)}
                            onValueChange={value => {
                                setServerUrlInput(value)
                                setConnectionStatus(undefined)
                                setUrlError(undefined)
                            }}
                            onTest={() => void testConnection()}
                            onSave={() => void saveConnection()}
                            onRetrySettings={() => window.location.reload()}
                        />
                    </>)}
                    <Line />
                    <DevSettings
                        mode={() => devStore.state.mode}
                        loadingPreview={() => devStore.state.loadingPreview}
                        onModeChange={devStore.setMode}
                        onLoadingPreviewChange={devStore.setLoadingPreview}
                    />
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
            title={t('settings.saveServerTitle')}
            description={t('settings.saveServerDescription')}
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
                        {t('common.cancel')}
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
                        {props.saving ? t('settings.saving') : t('settings.saveAndReload')}
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
    urlError: Accessor<string | undefined>
    settingsError: string | undefined
    hasSavedServerUrl: boolean
    onValueChange: (value: string) => void
    onTest: () => void
    onSave: () => void
    onRetrySettings: () => void
}

function ConnectionSettings(props: ConnectionSettingsProps) {
    return (
        <DetailSection title={t('settings.connection')}>
            <Show when={props.settingsError}>
                {message => (
                    <StatusMessage
                        kind='load-error'
                        size='compact'
                        message={t('settings.readSettingsError', { message: message() })}
                        classes={{ root: 'py-2' }}
                        onRetry={props.onRetrySettings}
                    />
                )}
            </Show>
            <div class='flex flex-col gap-2'>
                <Text
                    label={t('settings.localServerUrl')}
                    value={props.value()}
                    placeholder='http://127.0.0.1:3070'
                    invalid={!!props.urlError()}
                    onInput={props.onValueChange}
                />
                <Show
                    when={props.urlError()}
                    fallback={<p class='m-0 text-[11px] leading-4 text-fg-muted'>{t('settings.localServerUrlHint')}</p>}
                >
                    {message => <FieldHint tone='danger'>{message()}</FieldHint>}
                </Show>
                <div class='flex flex-wrap items-center gap-2'>
                    <Button
                        variant='soft'
                        tone='neutral'
                        disabled={props.testing() || props.saving() || props.value().trim() === ''}
                        onClick={props.onTest}
                    >
                        {props.testing() ? t('settings.testing') : t('settings.testConnection')}
                    </Button>
                    <Button
                        disabled={props.saving() || props.testing() || props.value().trim() === ''}
                        variant='solid'
                        tone='accent'
                        onClick={props.onSave}
                    >
                        {props.saving() ? t('settings.savingConnection') : props.hasSavedServerUrl ? t('settings.saveAndReload') : t('settings.saveAndConnect')}
                    </Button>
                    <ConnectionState status={props.connectionStatus()} />
                </div>
            </div>
        </DetailSection>
    )
}

function ConnectionState(props: { status: ConnectionStatus | undefined }) {
    return (
        <Show when={props.status}>
            {status => {
                const connected = status() === 'connected'
                return (
                    <span class={mergeClasses('flex items-center gap-1.5 text-[11px]', connected ? 'text-success-fg' : 'text-danger-fg')}>
                        <span class={mergeClasses('size-1.5 shrink-0 rounded-full', connected ? 'bg-success' : 'bg-danger')} />
                        {connected ? t('settings.connected') : t('settings.connectionFailed')}
                    </span>
                )
            }}
        </Show>
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
        <div class='flex items-center justify-between gap-4'>
            <div class='flex min-w-0 flex-col gap-[3px]'>
                <span class='text-xs leading-none text-fg-muted'>{props.label}</span>
                <span class='text-[11px] leading-4 text-fg-muted'>{props.hint}</span>
            </div>
            {props.children}
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
    { value: 'normal', label: () => t('settings.dev.normal') },
    { value: 'dev', label: () => t('settings.dev.dev') },
] as const satisfies readonly SegmentGroupOption<DevMode>[]

const previewOptions = [
    { value: 'off', label: () => t('settings.dev.off') },
    { value: 'on', label: () => t('settings.dev.on') },
] as const

function DevSettings(props: DevSettingsProps) {
    return (
        <DetailSection title={t('settings.dev.title')}>
            <SettingRow
                label={t('settings.dev.mode')}
                hint={t('settings.dev.modeHint')}
            >
                <SegmentGroup
                    value={props.mode()}
                    options={modeOptions}
                    onChange={props.onModeChange}
                />
            </SettingRow>

            <Show when={props.mode() === 'dev'}>
                <SettingRow
                    label={t('settings.dev.loadingPreview')}
                    hint={t('settings.dev.loadingPreviewHint')}
                >
                    <SegmentGroup
                        value={props.loadingPreview() ? 'on' : 'off'}
                        options={previewOptions}
                        onChange={value => props.onLoadingPreviewChange(value === 'on')}
                    />
                </SettingRow>
            </Show>
        </DetailSection>
    )
}
