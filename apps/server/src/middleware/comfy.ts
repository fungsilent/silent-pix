import { Elysia } from 'elysia'

import { serverStore } from '#/app.store'

export const comfyMiddleware = new Elysia({ name: 'comfy-middleware' })
    .derive(
        { as: 'scoped' },
        () => ({
            comfyClient: serverStore.get().comfyClient,
        }))
