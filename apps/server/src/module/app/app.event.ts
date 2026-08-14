import type { Event } from '@silent-pix/shared'

export function healthSnapshot(health: Event.Health.Snapshot): Event.Health.Changed {
    return {
        type: 'health.snapshot',
        health,
    }
}
