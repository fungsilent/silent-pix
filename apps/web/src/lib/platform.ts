import { invoke, isTauri } from '@tauri-apps/api/core'
import { z } from 'zod'

import { t } from '#/lib/i18n'

const nativeServerUrl = z.string().nullable()
const localServerUrl = z.string().trim().transform((input, context) => {
    const match = /^http:\/\/127\.0\.0\.1:([1-9][0-9]{0,4})$/.exec(input)
    if (!match) {
        context.addIssue({ code: 'custom', message: t('platform.localServerUrlFormat') })
        return z.NEVER
    }

    const port = Number(match[1])
    if (!Number.isInteger(port) || port < 1 || port > 65535 || port === 80) {
        context.addIssue({ code: 'custom', message: t('platform.localServerUrlPort') })
        return z.NEVER
    }

    return input
})

export type LocalServerUrl = z.output<typeof localServerUrl>

export type Platform = {
    kind: 'web' | 'desktop'
    endpoint: string | null
    settingsError?: string
}

let platform: Platform | undefined

export async function initializePlatform(): Promise<Platform> {
    if (!isTauri()) {
        platform = {
            kind: 'web',
            endpoint: window.location.origin,
        }
        return platform
    }

    platform = await readDesktopSettings()
    return platform
}

async function readDesktopSettings(): Promise<Platform> {
    try {
        const serverUrl = await readNativeServerUrl()
        return {
            kind: 'desktop',
            endpoint: serverUrl,
        }
    }
    catch (error) {
        return {
            kind: 'desktop',
            endpoint: null,
            settingsError: error instanceof Error ? error.message : t('platform.readSettingsFailed'),
        }
    }
}

async function readNativeServerUrl(): Promise<LocalServerUrl | null> {
    const result = nativeServerUrl.safeParse(await invoke<unknown>('read_server_url'))
    if (!result.success) {
        throw new Error(t('platform.unexpectedSettings'))
    }

    if (result.data === null) {
        return null
    }

    const parsedUrl = localServerUrl.safeParse(result.data)
    if (!parsedUrl.success) {
        throw new Error(parsedUrl.error.issues[0]?.message ?? t('platform.invalidServerUrl'))
    }

    return parsedUrl.data
}

export function getPlatform(): Platform {
    if (!platform) {
        throw new Error('Platform must be initialized before the UI starts.')
    }

    return platform
}

export function validateLocalServerUrl(value: string): LocalServerUrl {
    return localServerUrl.parse(value)
}

export async function saveLocalServerUrl(serverUrl: LocalServerUrl): Promise<void> {
    await invoke('write_server_url', { serverUrl })
}
