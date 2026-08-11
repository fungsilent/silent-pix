import type { Event } from '@silent-pix/shared'

export function taskChanged(task: Event.Task.Snapshot): Event.Task.Changed {
    return {
        type: 'task.changed',
        task,
    }
}
