import {
    createDatabaseClient,
} from '@silent-pix/db'
import { Elysia } from 'elysia'

import { loadEnv } from '#/config/env'

const env = loadEnv()
const database = createDatabaseClient(env.databasePath)

export const databaseMiddleware = new Elysia({ name: 'database-middleware' })
    .decorate('database', database)
    .onStop(() => {
        database.close()
    })
