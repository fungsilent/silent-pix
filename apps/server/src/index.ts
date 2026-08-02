import { createApp } from '#/app'
import { loadEnv } from '#/config/env'

const env = loadEnv()
const app = createApp()

app.listen({
    hostname: env.serverHost,
    port: env.serverPort,
}, () => {
    console.log(`Silent Pix server listening on http://${env.serverHost}:${env.serverPort}`)
})