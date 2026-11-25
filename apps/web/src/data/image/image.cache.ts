import { imageKeys } from '#/data/image/image.key'

import type { QueryClient } from '@tanstack/solid-query'

export function refreshImageListCache(queryClient: QueryClient): void {
    void queryClient.invalidateQueries({ queryKey: imageKeys.lists() })
}
