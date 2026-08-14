import { loraKeys, samplerKeys } from '#/features/task/task.query'
import { appStore } from '#/store/app'

import type { Event } from '@silent-pix/shared'
import type { QueryClient } from '@tanstack/solid-query'

export function handleHealthSnapshot(
    queryClient: QueryClient,
    event: Event.Health.Changed,
): void {
    const wasComfyDown = appStore.state.snapshot?.comfy === false

    appStore.setSnapshot(event.health)

    /* ComfyUI 重開後自動補回選項清單，不需要使用者去按 Retry */
    if (wasComfyDown && event.health.comfy) {
        void queryClient.refetchQueries({ queryKey: samplerKeys.list(), type: 'all' })
        void queryClient.refetchQueries({ queryKey: loraKeys.list(), type: 'all' })
    }
}
