import type { Event } from '@silent-pix/shared'

export function taskChanged(taskId: string): Event.Task.Changed {
    return {
        type: 'task.changed',
        taskId,
    }
}
