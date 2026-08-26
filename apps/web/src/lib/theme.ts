export const fieldTheme = {
    /* 原生控制項（input / button）用 :disabled */
    disabled: 'disabled:cursor-default disabled:border-line-subtle disabled:bg-white/[0.02] disabled:text-fg-muted',
    /* Ark 的非原生部位（Editable 的 Preview 之類）只給 data-disabled */
    disabledData: 'data-[disabled]:cursor-default data-[disabled]:border-line-subtle data-[disabled]:bg-white/[0.02] data-[disabled]:text-fg-muted',
} as const
