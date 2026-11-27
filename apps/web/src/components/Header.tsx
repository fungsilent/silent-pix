import { ChevronDown, Columns2, FileImage, Minus, RefreshCw, Settings, Sparkles, Square, Workflow, X } from 'lucide-solid'
import { createEffect, createMemo, For, Show } from 'solid-js'

import { Button } from '#/components/base/Button'
import { IssueChip } from '#/components/base/IssueChip'
import { Menu, MenuItem } from '#/components/base/Menu'
import { Popover } from '#/components/base/Popover'
import { useHealthQuery } from '#/data/app/app.query'
import { t } from '#/lib/i18n'
import { currentWindow, getPlatform, isMacDesktop } from '#/lib/platform'
import { useCurrentRouteName, useNavigateToRoute } from '#/routes'
import { appStore, serviceHealth } from '#/store/app'
import { appIssues, issueList } from '#/store/issue'
import { overlayStore } from '#/store/overlay'
import { mergeClasses } from '#/utils/style'

import type { RouteName } from '#/routes'
import type { JSX } from 'solid-js'

/* MARK: Header */
const modeIcon = { size: 13, strokeWidth: 1.6 }

const modes: { name: RouteName, label: () => string, icon: () => JSX.Element }[] = [
    { name: 'generate', label: () => t('header.generate'), icon: () => <Sparkles {...modeIcon} /> },
    { name: 'compare', label: () => t('header.compare'), icon: () => <Columns2 {...modeIcon} /> },
    { name: 'workflow', label: () => t('header.workflow'), icon: () => <Workflow {...modeIcon} /> },
]

const menuTrigger = 'h-7 shrink-0 gap-1.5 px-2.5 text-xs font-medium'

/*
 * Desktop 不用作業系統的標題列：Header 就是標題列。
 * data-tauri-drag-region 只作用在標記的元素本身，所以控制項照常可點，空白處可拖曳、雙擊放大。
 */
export function Header() {
    const platform = getPlatform()
    const navigate = useNavigateToRoute()
    const routeName = useCurrentRouteName()
    const windowControls = platform.kind === 'desktop' && !isMacDesktop()
    /* Desktop 疊加層從標題列下方開始（見 overlayRoot），所以標題列露出；開著時 App 控制停用並蓋上遮罩 */
    const appControlsInert = () => platform.kind === 'desktop' && overlayStore.isActive()
    const pageMode = () => modes.find(item => item.name === routeName())
    /* 在 Tools 或 Settings 頁時，模式選單仍顯示最後使用的模式 */
    const currentMode = createMemo<(typeof modes)[number]>(previous => pageMode() ?? previous, modes[0]!)
    const onMode = () => pageMode() !== undefined
    /* 再按一次 Settings 時回到進入前的頁面 */
    const lastPage = createMemo<RouteName | undefined>(previous => {
        const name = routeName()
        return name && name !== 'settings' ? name : previous
    })
    const toggleSettings = () => {
        if (routeName() !== 'settings') navigate('settings')
        else if (platform.endpoint) navigate(lastPage() ?? currentMode().name)
    }

    /* 問題清空時把展開狀態也收掉，否則下次冒出問題會直接彈開 */
    createEffect(() => {
        if (appIssues().length === 0) issueList.setOpen(false)
    })

    return (
        <header
            id='app-header'
            data-tauri-drag-region
            class={mergeClasses(
                'sticky top-0 z-30 flex h-9 shrink-0 items-center gap-1 bg-shell',
                isMacDesktop() ? 'pl-[78px]' : 'pl-1',
                windowControls ? 'pr-0' : 'pr-3',
            )}
        >
            {/* Desktop 有疊加層時兩組 App 控制 inert（不能點、不能用鍵盤進入），外觀由下方的遮罩處理 */}
            <div
                data-tauri-drag-region
                inert={appControlsInert()}
                class='flex shrink-0 items-center gap-1'
            >
                <Menu
                    disabled={!platform.endpoint}
                    classes={{ trigger: mergeClasses(menuTrigger, onMode() ? 'text-fg' : 'text-fg-muted') }}
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
                                value={mode.name}
                                label={mode.label()}
                                current={routeName() === mode.name}
                                icon={mode.icon()}
                                onSelect={() => navigate(mode.name)}
                            />
                        )}
                    </For>
                </Menu>

                <Menu
                    classes={{ trigger: mergeClasses(menuTrigger, routeName() === 'metadata' ? 'text-fg' : 'text-fg-muted') }}
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
                        current={routeName() === 'metadata'}
                        icon={(
                            <FileImage
                                size={14}
                                strokeWidth={1.7}
                            />
                        )}
                        onSelect={() => navigate('metadata')}
                    />
                </Menu>
            </div>

            <div
                data-tauri-drag-region
                class='h-full min-w-6 flex-1'
            />

            <div
                inert={appControlsInert()}
                class='flex shrink-0 items-center gap-1'
            >
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
                        root: mergeClasses(
                            'size-7 shrink-0 p-0',
                            routeName() === 'settings' ? 'bg-selected text-fg hover:bg-selected' : 'text-fg-secondary',
                        ),
                    }}
                    onClick={toggleSettings}
                >
                    <Settings
                        size={15}
                        strokeWidth={1.7}
                    />
                </Button>
            </div>
            {/* 像 VS Code：同一層遮罩蓋滿整條標題列（含視窗控制）。只負責外觀、不攔點擊，
                視窗控制與拖曳照常；App 控制靠上面兩組的 inert 停用 */}
            <Show when={appControlsInert()}>
                <div class='pointer-events-none absolute inset-0 z-20 bg-backdrop' />
            </Show>

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
                class={mergeClasses(control, 'hover:bg-danger hover:text-on-stage')}
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
                trigger: mergeClasses(
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
                    fallback={<span class={mergeClasses('size-2 shrink-0 rounded-full', dotClass.up)} />}
                >
                    <span class={mergeClasses('size-1.5 shrink-0 rounded-full', down().length > 0 ? dotClass.down : dotClass.unknown)} />
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
                        <span class={mergeClasses('size-1.5 shrink-0 rounded-full', dotClass[service.state])} />
                        <span class='text-fg-secondary'>{service.name}</span>
                        <span class='ml-auto text-fg-muted'>
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
