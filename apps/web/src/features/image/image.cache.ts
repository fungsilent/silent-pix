import { imageKeys } from '#/features/image/image.key'

import type { QueryClient } from '@tanstack/solid-query'

export function invalidateImageLists(queryClient: QueryClient): void {
    void queryClient.invalidateQueries({ queryKey: imageKeys.lists() })
}
