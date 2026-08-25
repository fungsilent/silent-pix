import { EditorView } from '@codemirror/view'

/* 尺寸沿用 prompt editor：行高 24、行號 gutter 42、名稱 gutter 128 */
const lineHeight = 24
const contentPaddingY = 6
const lineNumberWidth = 42
const fieldGutterWidth = 128

export const workflowEditorTheme = EditorView.theme({
    '&': {
        height: '100%',
        color: 'var(--sp-fg-muted)',
        /* 文字區比其他輸入框暗一階，gutter 再降到 surface，兩區才分得開 */
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
        lineHeight: `${lineHeight}px`,
    },
    '.cm-content': {
        padding: `${contentPaddingY}px 0`,
        caretColor: 'var(--sp-fg)',
    },
    '.cm-line': {
        boxSizing: 'border-box',
        minHeight: `${lineHeight}px`,
        padding: '0 10px',
    },
    '.cm-cursor, .cm-dropCursor': {
        borderLeftColor: 'var(--sp-fg)',
    },
    '.cm-selectionBackground, &.cm-focused .cm-selectionBackground': {
        backgroundColor: 'color-mix(in srgb, var(--sp-accent) 42%, transparent) !important',
    },
    '.cm-gutters': {
        border: 'none',
        color: 'var(--sp-fg-muted)',
        backgroundColor: 'var(--sp-surface)',
    },
    '.cm-gutter.cm-lineNumbers': {
        boxSizing: 'border-box',
        minWidth: `${lineNumberWidth}px`,
        borderRight: '1px solid var(--sp-line-subtle)',
    },
    '.cm-lineNumbers .cm-gutterElement': {
        boxSizing: 'border-box',
        minWidth: `${lineNumberWidth}px`,
        padding: '0 9px 0 0',
        lineHeight: `${lineHeight}px`,
    },
    '.cm-activeLineGutter': {
        color: 'var(--sp-fg-secondary)',
        backgroundColor: 'transparent',
    },

    '.cm-workflow-field-gutter': {
        boxSizing: 'border-box',
        width: `${fieldGutterWidth}px`,
        minWidth: `${fieldGutterWidth}px`,
        borderRight: '1px solid var(--sp-line-subtle)',
    },
    '.cm-workflow-field-gutter .cm-gutterElement': {
        boxSizing: 'border-box',
        padding: '0',
    },
    '.cm-workflow-field': {
        display: 'block',
        overflow: 'hidden',
        padding: '0 8px 0 10px',
        color: '#86efac',
        fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif',
        fontSize: '11px',
        lineHeight: `${lineHeight}px`,
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
    },
    '.cm-workflow-field-broken': {
        color: 'var(--sp-danger-fg)',
    },

    /* gutter 用文字色、textarea 用底色，綠＝已綁定、紅＝失效 */
    '.cm-line.cm-workflow-bound': {
        backgroundColor: 'color-mix(in srgb, #22c55e 10%, transparent)',
    },
    '.cm-line.cm-workflow-broken': {
        backgroundColor: 'color-mix(in srgb, #ef4444 12%, transparent)',
    },

    '.cm-workflow-node-id': { color: 'var(--sp-accent-fg)' },
    '.cm-workflow-key': { color: 'var(--sp-fg)' },
    '.cm-workflow-string': { color: '#86efac' },
    '.cm-workflow-number': { color: '#fcd34d' },
    '.cm-workflow-literal': { color: '#c4b5fd' },

    '.cm-placeholder': {
        color: 'var(--sp-fg-muted)',
    },
}, { dark: true })
