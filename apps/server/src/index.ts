import { createApp } from '#/app'
import { loadConfig } from '#/config'

const env = loadConfig()
const app = await createApp()

app.listen({
    hostname: env.serverHost,
    port: env.serverPort,
}, () => {
    console.log(`Silent Pix server listening on http://${env.serverHost}:${env.serverPort}`)
})

process.once('SIGINT', () => void stop())
process.once('SIGTERM', () => void stop())

let stopping = false

async function stop() {
    if (stopping) return
    stopping = true

    await app.stop()
}
