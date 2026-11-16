
import { attribute, docs, fragment, stateLabels } from '#/blueprint'

import type { APIRoute } from 'astro'

/*
 * 搜尋索引：開發伺服器上每次請求即時產生（改檔後重新整理就是新的），build 時輸出成靜態檔。
 * 直接從原始檔取：頁面標題、狀態標籤與範例畫面文字、規則全文。
 */
export type SearchItem = {
    kind: 'page' | 'state' | 'rule'
    url: string
    address: string
    page: string
    title: string
    text: string
}

function plain(markup: string): string {
    return markup
        .replace(/<[^>]+>/g, ' ')
        .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, '\'').replace(/&amp;/g, '&')
        .replace(/\\([{}])/g, '$1')
        .replace(/`/g, '')
        .replace(/\s+/g, ' ')
        .trim()
}

export const GET: APIRoute = async () => {
    const items: SearchItem[] = []
    const labels = await stateLabels()

    for (const entry of await docs()) {
        const path = entry.id === 'index' ? '' : entry.id
        const url = `/${path}${path ? '/' : ''}`
        const page = entry.data.title
        const body = entry.body ?? ''

        items.push({ kind: 'page', url, address: path, page, title: page, text: entry.data.description ?? '' })

        for (const [tag] of body.matchAll(/<State\b[^>]*\/>/g)) {
            const component = attribute(tag, 'component')
            const state = attribute(tag, 'state')
            const id = `${component}/state/${state}`
            items.push({
                kind: 'state',
                url: `${url}#${id}`,
                address: `${path}#${id}`,
                page,
                title: `${page} → ${attribute(tag, 'label')}`,
                text: plain(fragment(component, state)),
            })
        }

        for (const [tag] of body.matchAll(/<Slot\b[^>]*\/>/g)) {
            const component = attribute(tag, 'component')
            const name = attribute(tag, 'name')
            for (const state of attribute(tag, 'states').split(',').map(value => value.trim()).filter(Boolean)) {
                if (state === 'none' && tag.includes('empty=')) continue // Slot 的空狀態沒有內容可搜
                const address = `${path}#${name}=${state}`
                items.push({
                    kind: 'state',
                    url: `${url}#${name}=${state}`,
                    address,
                    page,
                    title: `${page} → ${labels.get(`${component}/${state}`) ?? state}`,
                    text: plain(fragment(component, state)),
                })
            }
        }

        for (const [tag, text = ''] of body.matchAll(/<Rule\b[^>]*>([\s\S]*?)<\/Rule>/g)) {
            const id = `${attribute(tag, 'component')}/rule/${attribute(tag, 'id')}`
            items.push({ kind: 'rule', url: `${url}#${id}`, address: `${path}#${id}`, page, title: attribute(tag, 'id'), text: plain(text) })
        }
    }

    return Response.json(items)
}
