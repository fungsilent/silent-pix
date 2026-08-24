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
        backgroundColor: 'var(--sp-hover)',
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
    '.cm-prompt-hatch': {
        backgroundImage: 'repeating-linear-gradient(-45deg, rgb(255 255 255 / 1.5%) 0 7px, rgb(255 255 255 / 6.5%) 7px 10px)',
        backgroundSize: '14.1421px 14.1421px',
    },
}, { dark: true })
