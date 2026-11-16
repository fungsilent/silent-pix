#!/usr/bin/env node
/*
 * Blueprint 版面檢查：build 後用 preview 開每一頁，在 1280／1600／2560 三種視窗寬度下檢查每個 State 的預覽：
 * - 超出框：框裡的內容超出預覽框（被裁掉），或沒有設計寬度的框本身超出舞台。
 * - 擠壓：跟「設計寬度（框的 min-width，沒有就 1400px）下的排版」比，多出文字截斷，或短文字（≤30 字）多換行。
 * 有問題時列出頁面與狀態，結束碼 1。
 *
 * 需要 Chromium：預設用 Playwright 快取（~/.cache/ms-playwright）裡的 headless shell，或以 CHROMIUM_PATH 指定。
 * 在藍圖專案的目錄執行（例如 package script "check": "blueprint-check"）。
 */
/* clipped()／squeezed() 在瀏覽器頁面裡執行（page.evaluate） */
/* global document, getComputedStyle */
import { execFileSync, spawn } from 'node:child_process'
import { existsSync, readdirSync } from 'node:fs'
import { homedir } from 'node:os'
import { createRequire } from 'node:module'
import { dirname, join, relative } from 'node:path'

import { chromium } from 'playwright-core'

const root = process.cwd()
const astro = join(dirname(createRequire(join(root, 'package.json')).resolve('astro/package.json')), 'bin/astro.mjs')
const port = 4397
const widths = [1280, 1600, 2560]
const env = { ...process.env, ASTRO_TELEMETRY_DISABLED: '1' }

function chromiumPath() {
    if (process.env.CHROMIUM_PATH) return process.env.CHROMIUM_PATH
    const cache = join(homedir(), '.cache/ms-playwright')
    if (!existsSync(cache)) return undefined
    const shells = readdirSync(cache).filter(name => name.startsWith('chromium_headless_shell-')).sort().reverse()
    for (const shell of shells) {
        const bin = join(cache, shell, 'chrome-headless-shell-linux64/chrome-headless-shell')
        if (existsSync(bin)) return bin
    }
    return undefined
}

function pages() {
    const docs = join(root, 'src/content/docs')
    const walk = dir => readdirSync(dir, { withFileTypes: true }).flatMap(entry => entry.isDirectory()
        ? walk(join(dir, entry.name))
        : entry.name.endsWith('.mdx') && entry.name !== 'index.mdx' ? [relative(docs, join(dir, entry.name)).replace(/\.mdx$/, '')] : [])
    return walk(docs).sort()
}

/* 超出框 */
function clipped() {
    return [...document.querySelectorAll('.ds-example')].flatMap(card => {
        const frame = card.querySelector('.ds-stage > .ds-frame > *')
        if (!frame) return []
        const label = card.querySelector('h3').textContent
        const box = frame.getBoundingClientRect()
        const stage = card.querySelector('.ds-stage').getBoundingClientRect()
        // 有設計寬度的框比舞台寬是刻意的（舞台左右捲動）；沒有設計寬度卻超出才是錯，例如縮框後內容反而變寬
        const designed = Number.parseFloat(getComputedStyle(frame).minWidth) > 0
        if (!designed && (box.left < stage.left - 1 || box.right > stage.right + 1)) return [`${label}（框超出舞台）`]
        // 部件自己裁切的內容（例如放大 200% 的圖片）不算，只看直接超出框的元素
        const clippedInside = el => {
            for (let p = el.parentElement; p && p !== frame; p = p.parentElement) if (getComputedStyle(p).overflowX !== 'visible') return true
            return false
        }
        const over = [...frame.querySelectorAll('*')].some(el => {
            const r = el.getBoundingClientRect()
            return r.width > 0 && (r.left < box.left - 1 || r.right > box.right + 1) && getComputedStyle(el).position !== 'fixed' && !clippedInside(el)
        })
        return over ? [`${label}（超出框）`] : []
    })
}

/* 擠壓 */
function squeezed() {
    const measure = scope => [...scope.querySelectorAll('*')].map(el => {
        const leaf = [...el.childNodes].some(n => n.nodeType === 3 && n.textContent.trim())
        if (!leaf || !el.getClientRects().length) return 0
        // 在真的水平捲動的容器裡（例如程式碼編輯器）超出寬度是設計；只設垂直捲動時 overflow-x 也會被算成 auto，所以要看實際寬度
        let scrolls = false
        for (let p = el.parentElement; p && p !== scope; p = p.parentElement) {
            if (/(auto|scroll)/.test(getComputedStyle(p).overflowX) && p.scrollWidth > p.clientWidth + 1) scrolls = true
        }
        const truncated = !scrolls && el.scrollWidth > el.clientWidth + 1 ? 1 : 0
        // 斷行只看短文字（按鈕、標籤），長段落在窄一點的空間多換行是正常的
        const short = el.textContent.trim().length <= 30
        const lines = short ? Math.round(el.getBoundingClientRect().height / (Number.parseFloat(getComputedStyle(el).lineHeight) || 16)) : 0
        return truncated * 100 + lines
    })
    const out = []
    for (const card of document.querySelectorAll('.ds-example')) {
        const frame = card.querySelector('.ds-stage > .ds-frame')
        if (!frame || card.querySelector('.ds-stage-themes')) continue
        const design = Number.parseFloat(getComputedStyle(frame.firstElementChild).minWidth) || 0
        const wide = frame.cloneNode(true)
        Object.assign(wide.style, { position: 'absolute', left: '-99999px', top: '0', width: `${design ? design + 2 : 1400}px` })
        frame.parentElement.append(wide)
        const a = measure(frame), b = measure(wide)
        wide.remove()
        if (a.some((value, i) => value > (b[i] ?? 0))) out.push(`${card.querySelector('h3').textContent}（擠壓）`)
    }
    return out
}

// Astro 同一專案只允許一個 preview：開始前先停掉，結束時用 astro preview stop 關（記 PID 會記到立刻結束的那個程序）
const stopPreview = () => {
    try {
        execFileSync(process.execPath, [astro, 'preview', 'stop'], { cwd: root, env, stdio: 'ignore' })
    } catch {
        /* 沒有在跑 */
    }
}

execFileSync(process.execPath, [astro, 'build'], { cwd: root, env, stdio: ['ignore', 'ignore', 'inherit'] })
stopPreview()
spawn(process.execPath, [astro, 'preview', '--port', String(port)], { cwd: root, env, stdio: 'ignore', detached: true }).unref()
let problems = 0
try {
    for (let i = 0; i < 40; i++) {
        if (await fetch(`http://localhost:${port}/`).then(() => true, () => false)) break
        await new Promise(resolve => setTimeout(resolve, 250))
    }
    const browser = await chromium.launch({ executablePath: chromiumPath() })
    for (const width of widths) {
        const page = await browser.newPage({ viewport: { width, height: 1000 } })
        for (const path of pages()) {
            const response = await page.goto(`http://localhost:${port}/${path}/`, { waitUntil: 'networkidle' })
            if (!response?.ok()) throw new Error(`${path}: HTTP ${response?.status()}`)
            const found = [...await page.evaluate(clipped), ...await page.evaluate(squeezed)]
            if (found.length > 0) {
                problems += found.length
                console.log(`${width}px  ${path} → ${found.join(' | ')}`)
            }
        }
        await page.close()
    }
    await browser.close()
} finally {
    stopPreview()
}
console.log(problems === 0 ? `版面檢查通過：${pages().length} 頁 × ${widths.join('／')}px` : `版面檢查發現 ${problems} 個問題`)
process.exit(problems === 0 ? 0 : 1)
