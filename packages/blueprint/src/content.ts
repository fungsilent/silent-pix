import { docsLoader } from '@astrojs/starlight/loaders'
import { docsSchema } from '@astrojs/starlight/schema'
import { defineCollection } from 'astro:content'

/* Starlight 的 docs collection；藍圖專案的 src/content.config.ts 只要轉出這個 */
export const collections = {
    docs: defineCollection({ loader: docsLoader(), schema: docsSchema() }),
}
