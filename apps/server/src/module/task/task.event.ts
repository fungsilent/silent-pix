import type { Event } from '@silent-pix/shared'

export function taskChanged(task: Event.Task.Snapshot): Event.Task.Changed {
    return {
        type: 'task.changed',
        task,
    }
}

export function taskRemoved(taskId: string): Event.Task.Removed {
    return {
        type: 'task.removed',
        taskId,
    }
}
