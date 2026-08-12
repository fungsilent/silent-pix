import { clsx } from 'clsx'
import { Menu } from 'lucide-solid'

import { useHealthQuery } from '#/features/app/app.query'

/* MARK: Header */
export function Header() {
    return (
        <header class='flex h-12 shrink-0 items-center gap-3 border-b border-line-subtle bg-surface pl-2.5 pr-3'>
            <button
                type='button'
                aria-label='Toggle navigation'
                class='flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-md text-fg-secondary hover:bg-hover hover:text-fg'
            >
                <Menu
                    size={16}
                    strokeWidth={1.6}
                    aria-hidden='true'
                />
            </button>
            <span class='text-[13px] font-semibold tracking-[0.02em] text-fg'>Silent Pix</span>

            <div class='flex-1' />

            <ServiceStatus />
        </header>
    )
}

/* MARK: ServiceStatus */
type ServiceState = 'up' | 'down' | 'unknown'

const serviceLabel: Record<string, string> = {
    comfy: 'ComfyUI connection',
    database: 'SQLite database',
}

const stateLabel: Record<ServiceState, string> = {
    down: 'disconnected',
    unknown: 'checking',
    up: 'connected',
}

function ServiceStatus() {
    const query = useHealthQuery()

    const state = (service: 'comfy' | 'database'): ServiceState => {
        if (query.isError) {
            return 'down'
        }

        const health = query.data
        if (!health) {
            return 'unknown'
        }

        return health[service] ? 'up' : 'down'
    }

    return (
        <button
            type='button'
            aria-label='Service status, click to re-check'
            class='flex h-7 shrink-0 cursor-pointer items-center rounded-md border border-line-subtle bg-elevated px-1'
            onClick={() => void query.refetch()}
        >
            <ServiceSegment
                service='database'
                name='DB'
                state={state('database')}
            />
            <span
                class='mx-0.5 h-3.5 w-px shrink-0 bg-line'
                aria-hidden='true'
            />
            <ServiceSegment
                service='comfy'
                name='Comfy'
                state={state('comfy')}
            />
        </button>
    )
}

/* MARK: ServiceSegment */
type ServiceSegmentProps = {
    name: string
    service: 'comfy' | 'database'
    state: ServiceState
}

function ServiceSegment(props: ServiceSegmentProps) {
    return (
        <span
            class={clsx(
                'flex h-5 items-center gap-1.5 rounded px-2 text-[11.5px] leading-none',
                // 只有異常那一段上底色，一眼定位是哪個服務出問題
                props.state === 'down'
                    ? 'bg-red-500/12 text-red-300'
                    : 'text-fg-secondary',
            )}
            title={`${serviceLabel[props.service]} — ${stateLabel[props.state]}`}
        >
            <span
                class={clsx(
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
