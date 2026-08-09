import { taskKeys } from '#/features/task/task.query'

import type { Event } from '@silent-pix/shared'
import type { QueryClient } from '@tanstack/solid-query'

export function handleTaskChanged(
    queryClient: QueryClient,
    _event: Event.Task.Changed,
): void {
    void queryClient.invalidateQueries({
        queryKey: taskKeys.all,
    })
}
