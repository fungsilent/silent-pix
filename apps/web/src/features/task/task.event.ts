import { cacheTaskChanged } from '#/features/task/task.cache'

import type { Event } from '@silent-pix/shared'
import type { QueryClient } from '@tanstack/solid-query'

export function handleTaskChanged(
    queryClient: QueryClient,
    event: Event.Task.Changed,
): void {
    cacheTaskChanged(queryClient, event.task)
}
