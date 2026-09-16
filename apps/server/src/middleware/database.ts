import { Elysia } from 'elysia'

import { serverStore } from '#/app.store'

export const databaseMiddleware = new Elysia({ name: 'database-middleware' })
    .derive(
        { as: 'scoped' },
        () => ({
            databaseClient: serverStore.get().databaseClient,
        }))
