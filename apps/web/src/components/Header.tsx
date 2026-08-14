import { Menu } from 'lucide-solid'

import { Button } from '#/components/base/Button'
import { useHealthQuery } from '#/features/app/app.query'
import { cn } from '#/lib/cn'
import { appStore, serviceHealth } from '#/store/app'

/* MARK: Header */
export function Header() {
    return (
        <header class='flex h-12 shrink-0 items-center gap-3 border-b border-line-subtle bg-surface pl-2.5 pr-3'>
            <Button
                variant='ghost'
                aria-label='Toggle navigation'
                classes={{ root: 'size-8 shrink-0 p-0 text-fg-secondary' }}
            >
                <Menu
                    size={16}
                    strokeWidth={1.6}
                    aria-hidden='true'
                />
            </Button>
            <span class='text-[13px] font-semibold tracking-[0.02em] text-fg'>Silent Pix</span>

            <div class='flex-1' />

            <ServiceStatus />
        </header>
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
            aria-label='Service status, click to re-check'
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
            aria-hidden='true'
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
                    ? 'bg-red-500/12 text-red-300'
                    : 'text-fg-secondary',
            )}
        >
            <span
                class={cn(
                    'size-1.5 shrink-0 rounded-full',
                    props.state === 'up' && 'bg-green-500 shadow-[0_0_0_3px_rgba(34,197,94,0.14)]',
                    props.state === 'down' && 'bg-red-500 shadow-[0_0_0_3px_rgba(239,68,68,0.14)]',
                    props.state === 'unknown' && 'bg-fg-muted',
                )}
                aria-hidden='true'
            />
            {props.name}
        </span>
    )
}
