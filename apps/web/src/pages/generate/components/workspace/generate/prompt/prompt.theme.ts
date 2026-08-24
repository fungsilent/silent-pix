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
}, { dark: true })
