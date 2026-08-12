import { useQuery } from '@tanstack/solid-query'

import { appApi } from '#/api/app'

const healthPollInterval = 10_000

export const healthKeys = {
    all: ['health'] as const,
}

export function useHealthQuery() {
    return useQuery(() => ({
        queryKey: healthKeys.all,
        queryFn: () => appApi.health(),
        refetchInterval: healthPollInterval,
        retry: false,
    }))
}
