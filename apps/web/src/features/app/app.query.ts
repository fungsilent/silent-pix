import { useQuery } from '@tanstack/solid-query'

import { appApi } from '#/api/app'

export const healthKeys = {
    all: ['health'] as const,
}

/*
 * 這個 query 只負責 WS 首次連上之前的初始值，以及手動重新檢查。
 */
export function useHealthQuery() {
    return useQuery(() => ({
        queryKey: healthKeys.all,
        queryFn: () => appApi.health(),
        retry: false,
    }))
}
