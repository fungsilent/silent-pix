import { useCurrentMatches, useNavigate } from '@solidjs/router'

export const routePaths = {
    generate: '/generate',
    compare: '/compare',
    workflow: '/workflow',
    metadata: '/tools/metadata',
    settings: '/settings',
} as const

export type RouteName = keyof typeof routePaths

const routeNames = Object.keys(routePaths) as RouteName[]

export function useCurrentRouteName() {
    const matches = useCurrentMatches()

    return () => {
        const pattern = matches().at(-1)?.route.pattern
        return routeNames.find(name => routePaths[name] === pattern)
    }
}

export function useNavigateToRoute() {
    const navigate = useNavigate()

    return (name: RouteName) => navigate(routePaths[name])
}
