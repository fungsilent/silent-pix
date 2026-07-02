import { defineConfig } from 'vite'
import solid from 'vite-plugin-solid'

export default defineConfig({
    plugins: [solid()],
    server: {
        host: '127.0.0.1',
        port: Number.parseInt(process.env.WEB_PORT ?? '5173', 10),
    },
})
