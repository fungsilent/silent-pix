import { Elysia } from 'elysia'

import { serverStore } from '#/app.store'

export const eventMiddleware = new Elysia({ name: 'event-middleware' })
    .derive(
        { as: 'scoped' },
        () => ({
            publishEvent: serverStore.get().publishEvent,
        }))
