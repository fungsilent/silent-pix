import { ChevronDown, Columns2, FileImage, Minus, RefreshCw, Settings, Sparkles, Square, Workflow, X } from 'lucide-solid'
import { createEffect, createMemo, For, Show } from 'solid-js'

import { Button } from '#/components/base/Button'
import { IssueChip } from '#/components/base/IssueChip'
import { Menu, MenuItem } from '#/components/base/Menu'
import { Popover } from '#/components/base/Popover'
import { useHealthQuery } from '#/features/app/app.query'
import { cn } from '#/lib/cn'
import { t } from '#/lib/i18n'
import { appIssues, issueList } from '#/lib/issue'
import { currentWindow, getPlatform, isMacDesktop } from '#/lib/platform'
import { appStore, serviceHealth } from '#/store/app'

import type { JSX } from 'solid-js'

/* MARK: Header */
type Mode = 'generate' | 'compare' | 'workflow'

const modeIcon = { size: 13, strokeWidth: 1.6 }

const modes: { value: Mode, label: () => string, icon: () => JSX.Element }[] = [
    { value: 'generate', label: () => t('header.generate'), icon: () => <Sparkles {...modeIcon} /> },
    { value: 'compare', label: () => t('header.compare'), icon: () => <Columns2 {...modeIcon} /> },
    { value: 'workflow', label: () => t('header.workflow'), icon: () => <Workflow {...modeIcon} /> },
]

const menuTrigger = 'h-7 shrink-0 gap-1.5 px-2.5 text-xs font-medium'

/*
 * Desktop 不用作業系統的標題列：Header 就是標題列。
 * data-tauri-drag-region 只作用在標記的元素本身，所以控制項照常可點，空白處可拖曳、雙擊放大。
 */
export function Header() {
    const platform = getPlatform()
    const windowControls = platform.kind === 'desktop' && !isMacDesktop()
    const pageMode = () => modes.find(item => item.value === appStore.state.page)
    /* 在 Tools 或 Settings 頁時，模式選單仍顯示最後使用的模式 */
    const currentMode = createMemo<(typeof modes)[number]>(previous => pageMode() ?? previous, modes[0]!)
    const onMode = () => pageMode() !== undefined

    /* 問題清空時把展開狀態也收掉，否則下次冒出問題會直接彈開 */
    createEffect(() => {
        if (appIssues().length === 0) issueList.setOpen(false)
    })

    return (
        <header
            data-tauri-drag-region
            class={cn(
                'flex h-9 shrink-0 items-center gap-1 border-b border-line-subtle bg-surface',
                isMacDesktop() ? 'pl-[78px]' : 'pl-3',
                windowControls ? 'pr-0' : 'pr-3',
            )}
        >
            <span
                data-tauri-drag-region
                class='mr-2 shrink-0 whitespace-nowrap text-[13px] font-semibold tracking-[0.02em] text-fg'
            >
                Silent Pix
            </span>

            <Menu
                disabled={!platform.endpoint}
                classes={{ trigger: cn(menuTrigger, onMode() ? 'text-fg' : 'text-fg-muted') }}
                trigger={(
                    <>
                        {currentMode().icon()}
                        {currentMode().label()}
                        <ChevronDown
                            class='shrink-0 opacity-60'
                            size={12}
                            strokeWidth={2}
                        />
                    </>
                )}
            >
                <For each={modes}>
                    {mode => (
                        <MenuItem
                            value={mode.value}
                            label={mode.label()}
                            current={appStore.state.page === mode.value}
                            icon={mode.icon()}
                            onSelect={() => appStore.setPage(mode.value)}
                        />
                    )}
                </For>
            </Menu>

            <Menu
                classes={{ trigger: cn(menuTrigger, appStore.state.page === 'metadata' ? 'text-fg' : 'text-fg-muted') }}
                trigger={(
                    <>
                        {t('header.tools')}
                        <ChevronDown
                            class='shrink-0 opacity-60'
                            size={12}
                            strokeWidth={2}
                        />
                    </>
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
            </Menu>

            <div
                data-tauri-drag-region
                class='h-full min-w-6 flex-1'
            />

            <IssueChip
                issues={appIssues()}
                open={issueList.open()}
                onOpenChange={issueList.setOpen}
            />
            <Show when={platform.endpoint}>
                <ServiceStatus />
            </Show>
            <Button
                variant='ghost'
                title={t('common.settings')}
                classes={{
                    root: cn(
                        'size-7 shrink-0 p-0',
                        appStore.state.page === 'settings' ? 'bg-selected text-fg hover:bg-selected' : 'text-fg-secondary',
                    ),
                }}
                onClick={() => appStore.setPage('settings')}
            >
                <Settings
                    size={15}
                    strokeWidth={1.7}
                />
            </Button>

            <Show when={windowControls}>
                <WindowControls />
            </Show>
        </header>
    )
}

/* MARK: WindowControls */
function WindowControls() {
    const control = 'flex h-full w-[46px] items-center justify-center text-fg-secondary outline-none hover:bg-hover'

    return (
        <div class='ml-2 flex h-full shrink-0'>
            <button
                type='button'
                title={t('header.minimize')}
                class={control}
                onClick={currentWindow.minimize}
            >
                <Minus
                    size={14}
                    strokeWidth={1.5}
                />
            </button>
            <button
                type='button'
                title={t('header.maximize')}
                class={control}
                onClick={currentWindow.toggleMaximize}
            >
                <Square
                    size={12}
                    strokeWidth={1.5}
                />
            </button>
            <button
                type='button'
                title={t('header.close')}
                class={cn(control, 'hover:bg-danger hover:text-on-stage')}
                onClick={currentWindow.close}
            >
                <X
                    size={14}
                    strokeWidth={1.5}
                />
            </button>
        </div>
    )
}

/* MARK: ServiceStatus */
type ServiceState = 'up' | 'down' | 'unknown'

const dotClass: Record<ServiceState, string> = {
    up: 'bg-success shadow-health-up',
    down: 'bg-danger shadow-health-down',
    unknown: 'bg-fg-muted',
}

function ServiceStatus() {
    const query = useHealthQuery()

    /*
     * WS 首次連上之前用 REST 的結果墊著；連上過之後一律以 WS 為準。
     * 斷線時 liveHealth() 會回 undefined，於是 DB / Comfy 轉為未知
     */
    const health = () => serviceHealth()
        ?? (appStore.state.hasConnected ? undefined : query.data)

    const serverState = (): ServiceState => {
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

    const services = () => [
        { name: 'Server', state: serverState() },
        { name: 'DB', state: state('database') },
        { name: 'Comfy', state: state('comfy') },
    ]
    const down = () => services().filter(service => service.state === 'down')
    const allUp = () => services().every(service => service.state === 'up')

    return (
        <Popover
            placement='bottom-end'
            classes={{
                trigger: cn(
                    'flex h-7 shrink-0 items-center justify-center gap-1.5 rounded-md text-xs',
                    allUp() ? 'w-7' : 'px-2',
                    down().length > 0
                        ? 'bg-danger/12 text-danger-fg hover:bg-danger/[0.18]'
                        : 'text-fg-muted hover:bg-hover data-[state=open]:bg-selected data-[state=open]:text-fg',
                ),
                content: 'w-60',
            }}
            trigger={(
                <Show
                    when={!allUp()}
                    fallback={<span class={cn('size-2 shrink-0 rounded-full', dotClass.up)} />}
                >
                    <span class={cn('size-1.5 shrink-0 rounded-full', down().length > 0 ? dotClass.down : dotClass.unknown)} />
                    {down().length === 0
                        ? t('header.status.connecting')
                        : down().length === 1
                            ? t('header.status.oneDown', { name: down()[0]!.name })
                            : t('header.status.downCount', { count: down().length })}
                </Show>
            )}
        >
            <For each={services()}>
                {service => (
                    <div class='flex h-8 items-center gap-2 px-2 text-xs'>
                        <span class={cn('size-1.5 shrink-0 rounded-full', dotClass[service.state])} />
                        <span class='text-fg-secondary'>{service.name}</span>
                        <span class={cn('ml-auto', service.state === 'down' ? 'text-danger-fg' : 'text-fg-muted')}>
                            {t(`header.status.${service.state}`)}
                        </span>
                    </div>
                )}
            </For>
            <div class='my-1 border-t border-line-subtle' />
            <div class='flex justify-end px-1 pb-0.5'>
                <Button
                    classes={{ root: 'h-6 shrink-0 gap-1.5 px-2' }}
                    onClick={() => void query.refetch()}
                >
                    <RefreshCw
                        size={12}
                        strokeWidth={1.8}
                    />
                    {t('header.status.recheck')}
                </Button>
            </div>
        </Popover>
    )
}
