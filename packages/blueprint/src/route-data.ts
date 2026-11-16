import { defineRouteMiddleware } from '@astrojs/starlight/route-data'

import { attribute } from '#/blueprint'

import type { DocEntry } from '#/blueprint'

/*
 * 右側目錄：每個 ## 章節底下列出該章節的 <State>（錨點 <component>/state/<state>），
 * 章節有 <Rules component> 時最後加一項 Rules。State 與 Rules 的標題由元件產生，不在 markdown 標題裡。
 */
export const onRequest = defineRouteMiddleware(({ locals }) => {
    const { toc } = locals.starlightRoute
    if (!toc) return
    const entry = locals.starlightRoute.entry as DocEntry
    for (const section of (entry.body ?? '').split(/^## /m).slice(1)) {
        const title = section.slice(0, section.indexOf('\n')).trim()
        const item = toc.items.find(heading => heading.depth === 2 && heading.text === title)
        if (!item) continue
        item.children = [...section.matchAll(/<State\b[^>]*\/>/g)].map(([tag]) => ({
            depth: 3,
            slug: `${attribute(tag, 'component')}/state/${attribute(tag, 'state')}`,
            text: attribute(tag, 'label'),
            children: [],
        }))
        const rules = /<Rules\b[^>]*>/.exec(section)?.[0]
        if (rules) {
            const part = attribute(rules, 'part')
            item.children.push({ depth: 3, slug: `${attribute(rules, 'component')}/rules${part ? `/${part}` : ''}`, text: 'Rules', children: [] })
        }
    }
})
