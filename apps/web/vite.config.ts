import { fileURLToPath } from 'node:url'

import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'
import solid from 'vite-plugin-solid'

import type { Plugin } from 'vite'

type BarrelRule = {
    exports: 'default' | 'named'
    subpath: (name: string) => string
}

const arkSubpath: Record<string, string> = {
    createListCollection: 'collection',
    createTreeCollection: 'collection',
}

const barrelRules: Record<string, BarrelRule> = {
    '@ark-ui/solid': {
        exports: 'named',
        subpath: name => `@ark-ui/solid/${arkSubpath[name] ?? kebabCase(name)}`,
    },
    'lucide-solid': {
        exports: 'default',
        subpath: name => `lucide-solid/icons/${kebabCase(name)}`,
    },
}

function kebabCase(name: string): string {
    return name
        .replace(/(?<=[a-z0-9])([A-Z])/g, '-$1')
        .replace(/(?<=[A-Za-z])(\d)/g, '-$1')
        .toLowerCase()
}

function subpathImports(): Plugin {
    const patterns = Object.entries(barrelRules).map(([barrel, rule]) => ({
        barrel,
        rule,
        /* `import type {` 不會被吃到，型別本來就會被抹掉，沒有 runtime 成本 */
        pattern: new RegExp(`import\\s*\\{([^}]+)\\}\\s*from\\s*'${barrel.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}'`, 'g'),
    }))

    return {
        name: 'barrel-subpath-imports',
        enforce: 'pre',
        apply: 'serve',
        transform(code, id) {
            if (!/\.tsx?$/.test(id) || id.includes('/node_modules/')) {
                return null
            }

            let next = code

            for (const { barrel, rule, pattern } of patterns) {
                if (!next.includes(`from '${barrel}'`)) {
                    continue
                }

                next = next.replace(pattern, (match, body: string) => rewriteImport(match, body, rule))
            }

            return next === code ? null : { code: next, map: null }
        },
    }
}

function rewriteImport(match: string, body: string, rule: BarrelRule): string {
    const specifiers = body.split(',').map(entry => entry.trim()).filter(Boolean)

    /* 混進 inline type modifier 就整句不動，免得把型別當值搬走 */
    if (specifiers.some(entry => entry.startsWith('type '))) {
        return match
    }

    const statements = specifiers.map(entry => {
        const [name = entry, local = name] = entry.split(/\s+as\s+/)
        const from = rule.subpath(name)

        if (rule.exports === 'default') {
            return `import ${local} from '${from}'`
        }

        return name === local
            ? `import { ${name} } from '${from}'`
            : `import { ${name} as ${local} } from '${from}'`
    })

    /* 併成一行再補回原本佔掉的換行，行號才不會位移——這個 transform 不出 sourcemap */
    const newlines = '\n'.repeat((match.match(/\n/g) ?? []).length)

    return statements.join('; ') + newlines
}

export default defineConfig({
    plugins: [subpathImports(), tailwindcss(), solid()],
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
