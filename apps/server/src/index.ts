import { createApp } from '#/app'
import { loadConfig } from '#/config'
import { stopImageMutationAdmission } from '#/module/image/image.mutation'

const env = loadConfig()
const appContext = await createApp()
const { app } = appContext

app.listen({
    hostname: env.serverHost,
    port: env.serverPort,
}, server => {
    let stopping = false

    async function stop() {
        if (stopping) return
        stopping = true

        stopImageMutationAdmission()
        try {
            // Elysia's universal callback type has an optional Bun peer that is not used by this Node adapter.
            // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
            await server.stop()
        }
        finally {
            await appContext.close()
        }
    }

    process.once('SIGINT', () => void stop())
    process.once('SIGTERM', () => void stop())
    console.log(`Silent Pix server listening on http://${env.serverHost}:${env.serverPort}`)
})
