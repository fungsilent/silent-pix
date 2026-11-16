import blueprint from '@silent-pix/blueprint'
import { defineConfig } from 'astro/config'

/*
 * Silent Pix 設計系統藍圖。框架（元件、搜尋、外框樣式、版面檢查）在 @silent-pix/blueprint，
 * 這裡只放內容：src/content/docs 的頁面、src/blueprint 的畫面片段、src/styles/tokens.css 的 token。
 */
export default defineConfig({
    integrations: [
        blueprint({
            title: 'Silent Pix Blueprint',
            css: './src/styles/blueprint.css',
            /* 側欄：先是基礎與基礎元件，再是產品頁面；每個產品頁面一頁，依序列出部件，最後是整頁 Screen */
            sidebar: [
                { label: '基礎', items: [{ autogenerate: { directory: 'foundations' } }] },
                {
                    label: '基礎元件',
                    items: [
                        { label: 'Action', items: [{ autogenerate: { directory: 'base/action' } }] },
                        { label: 'Input', items: [{ autogenerate: { directory: 'base/input' } }] },
                        { label: 'Feedback', items: [{ autogenerate: { directory: 'base/feedback' } }] },
                        { label: 'Container', items: [{ autogenerate: { directory: 'base/container' } }] },
                        { label: 'Media', items: [{ autogenerate: { directory: 'base/media' } }] },
                    ],
                },
                { label: '頁面', items: [{ autogenerate: { directory: 'pages' } }] },
            ],
        }),
    ],
})
