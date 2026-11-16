import starlight from '@astrojs/starlight'
import tailwindcss from '@tailwindcss/vite'

import type { StarlightUserConfig } from '@astrojs/starlight/types'
import type { AstroIntegration } from 'astro'

/*
 * 藍圖框架：把 Starlight 包成藍圖用的文件站。藍圖專案只提供內容（頁面、片段、token）與這幾個設定：
 * - title、sidebar：網站名稱與側欄。
 * - css：藍圖專案的樣式入口，先 import '@silent-pix/blueprint/global.css' 再 import 自己的 token。
 * 固定的部分：自製搜尋（開發模式也能用，所以關掉只在 build 後可用的 Pagefind）、不加上一頁／下一頁卡片、
 * 右側目錄由 route-data 依章節產生、標題／搜尋／主題切換換成藍圖自己的元件。
 */
type Options = {
    title: string
    sidebar: StarlightUserConfig['sidebar']
    css: string
}

export default function blueprint({ title, sidebar, css }: Options): AstroIntegration[] {
    return [
        starlight({
            title,
            sidebar,
            customCss: [css],
            pagefind: false,
            pagination: false,
            tableOfContents: { minHeadingLevel: 2, maxHeadingLevel: 3 },
            routeMiddleware: '@silent-pix/blueprint/route-data',
            components: {
                PageTitle: '@silent-pix/blueprint/components/PageTitle.astro',
                Search: '@silent-pix/blueprint/components/Search.astro',
                ThemeSelect: '@silent-pix/blueprint/components/ThemeToggle.astro',
            },
        }),
        {
            name: '@silent-pix/blueprint',
            hooks: {
                'astro:config:setup': ({ injectRoute, updateConfig }) => {
                    injectRoute({ pattern: '/search-index.json', entrypoint: '@silent-pix/blueprint/search-index' })
                    updateConfig({ vite: { plugins: [tailwindcss()] } })
                },
            },
        },
    ]
}
