import type { Event } from '@silent-pix/shared'

export function taskCreated(task: Event.Task.Snapshot): Event.Task.Created {
    return {
        type: 'task.created',
        task,
    }
}

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
