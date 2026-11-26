import { useQueryClient } from '@tanstack/solid-query'
import { createSignal } from 'solid-js'

import { probeConnection } from '#/data/app/app.api'
import { t } from '#/lib/i18n'
import { getPlatform, saveLocalServerUrl, validateLocalServerUrl } from '#/lib/platform'
import { routePaths } from '#/routes'
import { createIssueSource } from '#/store/issue'

import type { LocalServerUrl } from '#/lib/platform'

export type ConnectionStatus = 'connected' | 'failed'

/* Desktop 的 Server 位址：輸入與欄位錯誤、測試連線、儲存與換址確認、操作失敗 issue */
export function createServerConnection() {
    const queryClient = useQueryClient()
    const platform = getPlatform()
    const [serverUrlInput, setServerUrlInput] = createSignal(platform.endpoint ?? '')
    const [connectionStatus, setConnectionStatus] = createSignal<ConnectionStatus>()
    const [testing, setTesting] = createSignal(false)
    const [saving, setSaving] = createSignal(false)
    /* 欄位錯誤留在欄位下；儲存這類操作失敗進 Header 的 Issue chip */
    const [urlError, setUrlError] = createSignal<() => string>()
    const [actionError, setActionError] = createSignal<() => string>()
    createIssueSource(() => {
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

    const changeServerUrl = (value: string) => {
        setServerUrlInput(value)
        setConnectionStatus(undefined)
        setUrlError(undefined)
    }

    return {
        serverUrlInput,
        connectionStatus,
        testing,
        saving,
        urlError,
        pendingServerUrl,
        changeServerUrl,
        testConnection,
        saveConnection,
        persistServerUrl,
        cancelServerChange: () => setPendingServerUrl(undefined),
    }
}
