import { serve } from '@hono/node-server'

import { createApp } from './app.js'
import { loadEnv } from './config/env.js'

const env = loadEnv()
const app = createApp()

serve({
    fetch: app.fetch,
    hostname: env.serverHost,
    port: env.serverPort,
}, info => {
    console.log(`Silent Pix server listening on http://${info.address}:${info.port}`)
})
