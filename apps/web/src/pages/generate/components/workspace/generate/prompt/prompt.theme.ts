import { EditorView } from '@codemirror/view'

/* MARK: geometry */

export const promptGutterWidth = {
    lineNumber: 42,
    groupName: 128,
} as const

export const promptLineHeight = 24

/* MARK: theme */

export const promptTheme = EditorView.theme({
    '&': {
        height: '100%',
        color: 'var(--sp-fg)',
        backgroundColor: 'var(--sp-canvas)',
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
        minHeight: '100%',
        padding: '6px 10px',
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
        backgroundColor: 'var(--sp-canvas)',
    },
    '.cm-gutter.cm-lineNumbers': {
        boxSizing: 'border-box',
        minWidth: `${promptGutterWidth.lineNumber}px`,
        borderRight: '1px solid var(--sp-line-subtle)',
    },
    '.cm-lineNumbers .cm-gutterElement': {
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
        boxSizing: 'border-box',
        display: 'flex',
        alignItems: 'center',
        gap: '1px',
        height: `${promptLineHeight}px`,
        padding: '0 8px 0 2px',
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
    '.cm-prompt-group-dot::before': {
        content: '""',
        width: '6px',
        height: '6px',
        borderRadius: '50%',
        backgroundColor: 'var(--sp-accent-hover)',
    },
    '.cm-prompt-group-dot[data-enabled="false"]::before': {
        backgroundColor: 'var(--sp-fg-muted)',
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
    '.cm-prompt-hatch': {
        backgroundImage: 'repeating-linear-gradient(-45deg, rgb(255 255 255 / 1.5%) 0 7px, rgb(255 255 255 / 6.5%) 7px 10px)',
        backgroundSize: '14.1421px 14.1421px',
    },
}, { dark: true })
