import { Hono } from 'hono'

import type { HealthDto } from '@silent-pix/shared'

import { ok } from '../responses/api-response.js'

export const healthRoutes = new Hono()

healthRoutes.get('/health', context => {
    return context.json(ok<HealthDto>({
        status: 'ok',
        service: 'silent-pix-server',
    }))
})
