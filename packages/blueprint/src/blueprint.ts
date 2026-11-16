import { getCollection } from 'astro:content'

/*
 * 藍圖片段：使用這個套件的藍圖專案裡的 src/blueprint/<component>/<state>.html，L1 狀態、L2 slot 與搜尋索引共用。
 * 開頭的 / 是 Vite 專案根目錄（藍圖專案），不是這個套件。
 */
const fragments = import.meta.glob<string>('/src/blueprint/**/*.html', { query: '?raw', import: 'default', eager: true })

/*
 * 片段可以引用其他部件：<div data-ds-slot="<component>" data-ds-state="<state>"></div> 會換成該部件的片段（可多層），
 * 外層加 contents 不影響版面。缺片段或循環引用時 build 失敗。
 */
const slotTag = /<div data-ds-slot="([^"]+)" data-ds-state="([^"]+)"><\/div>/g

export function fragment(component: string, state: string, chain: string[] = []): string {
    const key = `${component}/${state}`
    const markup = fragments[`/src/blueprint/${key}.html`]
    if (markup === undefined) throw new Error(`Missing blueprint fragment: ${key}${chain.length ? ` (from ${chain.join(' → ')})` : ''}`)
    if (chain.includes(key)) throw new Error(`Blueprint fragment cycle: ${[...chain, key].join(' → ')}`)
    return markup.replace(slotTag, (_, child: string, childState: string) => `<div class="contents">${fragment(child, childState, [...chain, key])}</div>`)
}

/* 套件看不到藍圖專案產生的 collection 型別；這裡只用到 Starlight docs 的這幾個欄位 */
export type DocEntry = { id: string, body?: string, data: { title: string, description?: string } }

export async function docs(): Promise<DocEntry[]> {
    return await getCollection('docs') as DocEntry[]
}

export function attribute(tag: string, name: string): string {
    return new RegExp(`${name}="([^"]*)"`).exec(tag)?.[1] ?? ''
}

/* 狀態標籤：L1 部件寫在 <State label>；只出現在 L2 的整頁狀態寫在 <Slot labels>（以 | 分隔，順序同 states） */
export async function stateLabels(): Promise<Map<string, string>> {
    const labels = new Map<string, string>()
    for (const entry of await docs()) {
        for (const [tag] of (entry.body ?? '').matchAll(/<State\b[^>]*\/>/g)) {
            labels.set(`${attribute(tag, 'component')}/${attribute(tag, 'state')}`, attribute(tag, 'label'))
        }
        for (const [tag] of (entry.body ?? '').matchAll(/<Slot\b[^>]*\/>/g)) {
            const component = attribute(tag, 'component')
            const names = attribute(tag, 'labels').split('|')
            attribute(tag, 'states').split(',').forEach((state, index) => {
                const label = names[index]?.trim()
                if (label) labels.set(`${component}/${state.trim()}`, label)
            })
        }
    }
    return labels
}
