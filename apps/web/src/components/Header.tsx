import { Menu } from 'lucide-solid'

import { Button } from '#/components/base/Button'
import { Label } from '#/components/base/Label'

import type { EventConnectionStatus } from '@silent-pix/event/client'

type HeaderProps = {
    connectionStatus: EventConnectionStatus
    lastEventTime: string
}

export function Header(props: HeaderProps) {
    return (
        <header class='flex items-center justify-between gap-4 h-[56px] border-b border-[#263241] bg-[#0d1218]'>
            <div class='flex min-w-0 items-center gap-2.5'>
                <Button
                    aria-label='Toggle navigation'
                    classes={{ root: 'text-blue-100' }}
                >
                    <Menu
                        size={16}
                        strokeWidth={2}
                        aria-hidden='true'
                    />
                </Button>
            </div>

            <div class='flex min-w-0 items-center gap-2.5 max-[720px]:w-full max-[720px]:overflow-x-auto max-[720px]:pb-0.5'>
                <Label
                    label='Server event connection'
                    tone='online'
                >
                    <span
                        class='h-2 w-2 shrink-0 rounded-full bg-green-500 shadow-[0_0_0_3px_rgba(34,197,94,0.14)]'
                        aria-hidden='true'
                    />
                    <span>Events</span>
                    <span class='text-green-500'>{props.connectionStatus}</span>
                </Label>
                <Label label='Last server event'>
                    <span>Last: {props.lastEventTime}</span>
                </Label>
            </div>
        </header>
    )
}
