import { fileURLToPath } from 'node:url'

import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'
import solid from 'vite-plugin-solid'

export default defineConfig({
    plugins: [tailwindcss(), solid()],
    resolve: {
        /*
         * `#` 不能放在這裡：alias 是全域的，會把其他 workspace 套件
         * 自己的 `#/` subpath imports 一起劫走（例如 @silent-pix/shared
         * 的 dist 內部就用 `#/event/index`）。改由 package.json 的
         * imports 欄位解析，那是套件範圍的，不會互相污染。
         */
        alias: {
            '@': fileURLToPath(new URL('./src', import.meta.url)),
        },
    },
    server: {
        host: '127.0.0.1',
        port: Number.parseInt(process.env.WEB_PORT ?? '5173', 10),
        proxy: {
            '/api': {
                target: `http://${process.env.SERVER_HOST ?? '127.0.0.1'}:${process.env.SERVER_PORT ?? '3070'}`,
                changeOrigin: true,
                ws: true,
            },
        },
    },
})
