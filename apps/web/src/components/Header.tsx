import { Columns2, FileImage, Menu as MenuIcon, Moon, Settings, Sparkles, Sun, Workflow } from 'lucide-solid'
import { Show } from 'solid-js'

import { Button } from '#/components/base/Button'
import { Menu, MenuItem } from '#/components/base/Menu'
import { SegmentGroup } from '#/components/base/SegmentGroup'
import { useHealthQuery } from '#/features/app/app.query'
import { cn } from '#/lib/cn'
import { t } from '#/lib/i18n'
import { getPlatform } from '#/lib/platform'
import { appStore, serviceHealth } from '#/store/app'
import { themeStore } from '#/store/theme'

import type { SegmentGroupOption } from '#/components/base/SegmentGroup'

/* MARK: Header */
type Mode = 'generate' | 'compare' | 'workflow'

const modeIcon = { size: 13, strokeWidth: 1.6 }

const modeOptions = [
    { value: 'generate', label: () => t('header.generate'), icon: () => <Sparkles {...modeIcon} /> },
    { value: 'compare', label: () => t('header.compare'), icon: () => <Columns2 {...modeIcon} /> },
    { value: 'workflow', label: () => t('header.workflow'), icon: () => <Workflow {...modeIcon} /> },
] as const satisfies readonly SegmentGroupOption<Mode>[]

export function Header() {
    const platform = getPlatform()

    return (
        <header class='flex h-12 shrink-0 items-center gap-3 overflow-x-auto border-b border-line-subtle bg-surface pl-2.5 pr-3'>
            <AppMenu />
            <span class='shrink-0 whitespace-nowrap text-[13px] font-semibold tracking-[0.02em] text-fg'>Silent Pix</span>

            <SegmentGroup
                value={modeOptions.find(option => option.value === appStore.state.page)?.value ?? null}
                options={modeOptions}
                disabled={!platform.endpoint}
                classes={{ root: 'ml-1' }}
                onChange={appStore.setPage}
            />

            <div class='flex-1' />

            <ThemeToggle />
            <Show when={platform.endpoint}>
                <ServiceStatus />
            </Show>
        </header>
    )
}

function AppMenu() {
    return (
        <Menu
            classes={{ trigger: 'size-7 shrink-0 text-fg-secondary' }}
            trigger={(
                <MenuIcon
                    size={16}
                    strokeWidth={1.6}
                />
            )}
        >
            <MenuItem
                value='metadata'
                label={t('metadata.title')}
                current={appStore.state.page === 'metadata'}
                icon={(
                    <FileImage
                        size={14}
                        strokeWidth={1.7}
                    />
                )}
                onSelect={() => appStore.setPage('metadata')}
            />
            <MenuItem
                value='settings'
                label={t('common.settings')}
                current={appStore.state.page === 'settings'}
                icon={(
                    <Settings
                        size={14}
                        strokeWidth={1.7}
                    />
                )}
                onSelect={() => appStore.setPage('settings')}
            />
        </Menu>
    )
}

function ThemeToggle() {
    const dark = () => themeStore.state.theme === 'dark'

    return (
        <Button
            variant='ghost'
            title={dark() ? t('header.switchToLightTheme') : t('header.switchToDarkTheme')}
            classes={{ root: 'size-7 shrink-0 p-0 text-fg-secondary' }}
            onClick={() => themeStore.toggleTheme()}
        >
            {dark()
                ? (
                    <Sun
                        size={16}
                        strokeWidth={1.7}
                    />
                )
                : (
                    <Moon
                        size={16}
                        strokeWidth={1.7}
                    />
                )}
        </Button>
    )
}

/* MARK: ServiceStatus */
type ServiceState = 'up' | 'down' | 'unknown'

function ServiceStatus() {
    const query = useHealthQuery()

    /*
     * WS 首次連上之前用 REST 的結果墊著；連上過之後一律以 WS 為準。
     * 斷線時 liveHealth() 會回 undefined，於是 DB / Comfy 轉為未知
     */
    const health = () => serviceHealth()
        ?? (appStore.state.hasConnected ? undefined : query.data)

    const connectionState = (): ServiceState => {
        if (appStore.state.connection === 'connected') {
            return 'up'
        }

        return appStore.state.hasConnected ? 'down' : 'unknown'
    }

    const state = (service: 'comfy' | 'database'): ServiceState => {
        const value = health()

        if (!value) {
            return 'unknown'
        }

        return value[service] ? 'up' : 'down'
    }

    return (
        <Button
            classes={{ root: 'h-7 shrink-0 gap-0 border-line-subtle px-1 py-0' }}
            onClick={() => void query.refetch()}
        >
            <ServiceSegment
                service='server'
                name='Server'
                state={connectionState()}
            />
            <Divider />
            <ServiceSegment
                service='database'
                name='DB'
                state={state('database')}
            />
            <Divider />
            <ServiceSegment
                service='comfy'
                name='Comfy'
                state={state('comfy')}
            />
        </Button>
    )
}

function Divider() {
    return (
        <span
            class='mx-0.5 h-3.5 w-px shrink-0 bg-line'
        />
    )
}

/* MARK: ServiceSegment */
type ServiceSegmentProps = {
    name: string
    service: 'comfy' | 'database' | 'server'
    state: ServiceState
}

function ServiceSegment(props: ServiceSegmentProps) {
    return (
        <span
            class={cn(
                'flex h-5 items-center gap-1.5 rounded px-2 text-[11.5px] leading-none',
                props.state === 'down'
                    ? 'bg-danger/12 text-danger-fg'
                    : 'text-fg-secondary',
            )}
        >
            <span
                class={cn(
                    'size-1.5 shrink-0 rounded-full',
                    props.state === 'up' && 'bg-success shadow-health-up',
                    props.state === 'down' && 'bg-danger shadow-health-down',
                    props.state === 'unknown' && 'bg-fg-muted',
                )}
            />
            {props.name}
        </span>
    )
}
