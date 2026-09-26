import { EditorView } from '@codemirror/view'

import type { Theme } from '#/store/theme'

/* MARK: geometry */

const promptGutterWidth = {
    lineNumber: 42,
    groupName: 128,
} as const

const promptLineHeight = 24

/* .cm-content 的上下 padding，min-height 要一起算進去才會剛好是整數行 */
const promptContentPaddingY = 6

/* 預設高度固定顯示幾行，內容超過就捲動；使用者仍可拖曳改變 */
const promptDefaultLines = 4
export const promptDefaultHeight = promptLineHeight * promptDefaultLines + promptContentPaddingY * 2

/* 拖曳能縮到的下限：一行 */
const promptMinLines = 1
export const promptMinHeight = promptLineHeight * promptMinLines + promptContentPaddingY * 2

/* MARK: theme */

export function createPromptTheme(theme: Theme) {
    return EditorView.theme({
        '&': {
        /*
         * 未拖曳前高度由內容決定（height: 100% 在 auto 高度的容器裡會算成 auto），
         * 使用者拉過之後容器有了明確高度，editor 就填滿它。
         * 寫死 height 會讓每個 editor 直接吃滿上限，把下方的圖片區壓掉。
         */
            /* 高度由 host 決定：預設 4 行，使用者拉大之後 host 有明確高度，這裡填滿它 */
            height: '100%',
            color: 'var(--sp-fg)',
            /*
         * 文字區比其他輸入框（--sp-active）暗一階：Prompt 是一大塊區域，
         * 用輸入框的亮度會太淺。gutter 再降到 --sp-surface，兩區才分得開。
         */
            backgroundColor: 'var(--sp-elevated)',
            fontSize: '12px',
        },
        '&.cm-focused': {
            outline: 'none',
        },
        '.cm-scroller': {
            overflow: 'auto',
            scrollbarGutter: 'stable',
            fontFamily: 'ui-monospace, "SFMono-Regular", Consolas, monospace',
            lineHeight: `${promptLineHeight}px`,
        },
        '.cm-content': {
            padding: `${promptContentPaddingY}px 10px`,
            caretColor: 'var(--sp-fg)',
        },
        '.cm-line': {
            boxSizing: 'border-box',
            minHeight: `${promptLineHeight}px`,
            padding: '0',
        },
        '.cm-cursor, .cm-dropCursor': {
            borderLeftColor: 'var(--sp-fg)',
        },
        '.cm-selectionBackground, &.cm-focused .cm-selectionBackground': {
            backgroundColor: 'color-mix(in srgb, var(--sp-accent) 42%, transparent) !important',
        },
        '.cm-activeLine': {
            backgroundColor: 'color-mix(in srgb, var(--sp-accent) 9%, transparent)',
        },
        '.cm-gutters': {
            border: 'none',
            color: 'var(--sp-fg-muted)',
            backgroundColor: 'var(--sp-surface)',
        },
        '.cm-gutter.cm-lineNumbers': {
            boxSizing: 'border-box',
            minWidth: `${promptGutterWidth.lineNumber}px`,
            borderRight: '1px solid var(--sp-line-subtle)',
        },
        '.cm-lineNumbers .cm-gutterElement': {
            cursor: 'ns-resize',
            boxSizing: 'border-box',
            minWidth: `${promptGutterWidth.lineNumber}px`,
            padding: '0 9px 0 0',
            lineHeight: `${promptLineHeight}px`,
        },
        '.cm-activeLineGutter': {
            color: 'var(--sp-fg-secondary)',
            backgroundColor: 'transparent',
        },

        /* group-name gutter：固定寬度、border-box，hover/rename/remove 一律走 overlay */
        '.cm-gutter.cm-prompt-group-gutter': {
            boxSizing: 'border-box',
            width: `${promptGutterWidth.groupName}px`,
            minWidth: `${promptGutterWidth.groupName}px`,
            borderRight: '1px solid var(--sp-line-subtle)',
        },
        '.cm-prompt-group-gutter .cm-gutterElement': {
            boxSizing: 'border-box',
            padding: '0',
        },
        '.cm-prompt-group-cell': {
            position: 'relative',
            boxSizing: 'border-box',
            display: 'flex',
            alignItems: 'center',
            gap: '1px',
            height: `${promptLineHeight}px`,
            padding: '0 23px 0 2px',
            overflow: 'hidden',
        },

        /*
     * 命中區是 18×24 的透明外框，實心點由 ::before 畫。
     * 這樣可點範圍大了一個量級，但 dot 的視覺位置與大小完全不變。
     */
        '.cm-prompt-group-dot': {
            boxSizing: 'border-box',
            display: 'grid',
            flex: 'none',
            width: '18px',
            height: `${promptLineHeight}px`,
            placeItems: 'center',
            cursor: 'pointer',
        },
        /* 開啟＝success 實心、關閉＝空心灰環：顏色與形狀同時承載，不單靠明度 */
        '.cm-prompt-group-dot::before': {
            content: '""',
            width: '6px',
            height: '6px',
            borderRadius: '50%',
            backgroundColor: 'var(--sp-success)',
        },
        '.cm-prompt-group-dot[data-enabled="false"]::before': {
            width: '7px',
            height: '7px',
            backgroundColor: 'transparent',
            boxShadow: 'inset 0 0 0 1.5px var(--sp-fg-muted)',
        },
        '.cm-prompt-group-name': {
            minWidth: '0',
            overflow: 'hidden',
            color: 'var(--sp-fg-secondary)',
            fontFamily: 'inherit',
            fontSize: '11px',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
        },
        '.cm-prompt-group-cell:has(.cm-prompt-group-dot[data-enabled="false"]) .cm-prompt-group-name': {
            color: 'var(--sp-fg-muted)',
        },

        /*
     * Remove `−` 絕對定位在 cell 右側，hover 才顯示。
     * 用 absolute 而不是 flex item，出現時才不會把 name 往左擠。
     */
        '.cm-prompt-group-remove': {
            position: 'absolute',
            top: '50%',
            right: '4px',
            display: 'grid',
            width: '15px',
            height: '15px',
            placeItems: 'center',
            border: '0',
            borderRadius: '3px',
            backgroundColor: 'var(--sp-elevated)',
            color: 'var(--sp-danger-fg)',
            font: '600 12px/1 ui-monospace, monospace',
            opacity: '0',
            transform: 'translateY(-50%)',
            cursor: 'pointer',
        },
        '.cm-prompt-group-cell:hover': {
            backgroundColor: 'var(--sp-active)',
        },
        '.cm-prompt-group-cell:hover .cm-prompt-group-remove': {
            opacity: '1',
        },
        '.cm-prompt-group-remove:hover': {
            backgroundColor: 'var(--sp-elevated-hover)',
        },

        /* Rename input 覆蓋整個 cell，不參與尺寸計算 */
        '.cm-prompt-group-cell[data-renaming="true"]': {
            backgroundColor: 'transparent',
        },
        '.cm-prompt-group-rename': {
            position: 'absolute',
            inset: '1px 4px 1px 2px',
            boxSizing: 'border-box',
            padding: '0 5px',
            border: '1px solid var(--sp-accent)',
            borderRadius: '3px',
            outline: 'none',
            backgroundColor: 'var(--sp-elevated)',
            color: 'var(--sp-fg)',
            font: '11px/1 inherit',
        },

        /* Group Move：cell 本身是 drag handle */
        '.cm-prompt-group-cell[data-renaming="false"]:hover': {
            cursor: 'grab',
        },
        /* 落點是全寬橫線，跟 token 拖曳的直立 caret 刻意不同軸 */
        '.cm-prompt-drop-line': {
            height: '2px',
            backgroundColor: 'var(--sp-accent-hover)',
            boxShadow: '0 0 8px color-mix(in srgb, var(--sp-accent) 70%, transparent)',
        },

        /*
     * Token 落點是 2px 直立 caret，只佔一個字元寬 —— 跟 group move 的全寬橫線
     * 刻意不同軸，兩種拖曳同時存在也不會認錯。
     */
        '.cm-prompt-token-caret': {
            width: '2px',
            backgroundColor: 'var(--sp-accent-hover)',
            boxShadow: '0 0 6px color-mix(in srgb, var(--sp-accent) 70%, transparent)',
        },
        /* 拖到 group name cell = 接到該組結尾，目標比逗號縫大得多 */
        '&.cm-prompt-drop-group .cm-prompt-group-cell[data-group-id]:hover': {
            backgroundColor: 'color-mix(in srgb, var(--sp-accent) 20%, transparent)',
            boxShadow: 'inset 0 0 0 1px color-mix(in srgb, var(--sp-accent-hover) 55%, transparent)',
        },

        /* 拖曳預覽：藍色選取只在 line-number gutter，text area 只給極低對比 wash */
        '.cm-lineNumbers .cm-gutterElement.cm-prompt-line-pending': {
            color: 'var(--sp-accent-fg)',
            backgroundColor: 'color-mix(in srgb, var(--sp-accent) 34%, transparent)',
        },
        '.cm-line.cm-prompt-line-covered': {
            backgroundColor: 'color-mix(in srgb, var(--sp-accent) 8%, transparent)',
        },
        '.cm-prompt-line-drag .cm-lineNumbers .cm-gutterElement': {
            cursor: 'ns-resize',
        },

        /* Disabled Group 文字降一階；暗紋由 layer 畫，不掛在 .cm-line 上 */
        '.cm-line.cm-prompt-group-off': {
            color: 'var(--sp-fg-secondary)',
        },
        /*
     * 單一 background layer，並鎖定 background-size 成一塊會無縫接合的方磚。
     *
     * CSS linear-gradient 的相位是以元素中心為基準算的，所以高度不同的兩個矩形
     * 條紋一定對不上。把 background-size 固定成方磚之後，pattern 只跟方磚有關、
     * 跟元素尺寸無關，再配合 marker 設定的 background-position 就能對齊。
     *
     * 方磚邊長 10√2 ≈ 14.1421px：-45° 下 gradient line 長度剛好 20px，
     * 正好是兩個 10px 週期，左右上下都無縫。
     */
        /*
     * Disabled Token：降兩階灰 + 1px 實線底線，線在字下方 4px 不穿過字身。
     * 無背景色。
     */
        '.cm-prompt-token-off': {
            color: 'var(--sp-fg-muted)',
            textDecoration: 'underline solid 1px',
            textDecorationColor: 'currentColor',
            textUnderlineOffset: '4px',
        },
        /*
     * Group 關掉時 token 保留底線，但文字色跟隨整組 —— 兩個狀態靠形狀分開，
     * 不需要互相遮蔽，使用者在 Group 關閉時仍看得見哪些 token 原本就關著。
     */
        '.cm-line.cm-prompt-group-off .cm-prompt-token-off': {
            color: 'inherit',
        },

        /* 按住 Alt 才進入 token 模式：游標變手指，hover 的 token 才有底色 */
        '&.cm-prompt-alt .cm-content': {
            cursor: 'pointer',
        },
        '&.cm-prompt-alt .cm-prompt-token:hover': {
            borderRadius: '3px',
            backgroundColor: 'color-mix(in srgb, var(--sp-accent) 34%, transparent)',
            color: 'var(--sp-fg)',
        },

        '.cm-prompt-hatch': {
            backgroundImage: 'repeating-linear-gradient(-45deg, var(--sp-prompt-hatch-low) 0 7px, var(--sp-prompt-hatch-high) 7px 10px)',
            backgroundSize: '14.1421px 14.1421px',
        },
    }, { dark: theme === 'dark' })
}
