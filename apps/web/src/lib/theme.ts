export const fieldTheme = {
    /* 原生控制項（input / button）用 :disabled */
    disabled: 'disabled:cursor-default disabled:border-line-subtle disabled:bg-disabled disabled:text-fg-muted',
    /* Ark 的非原生部位（Editable 的 Preview 之類）只給 data-disabled */
    disabledData: 'data-[disabled]:cursor-default data-[disabled]:border-line-subtle data-[disabled]:bg-disabled data-[disabled]:text-fg-muted',
} as const

export const taskFlagTheme = {
    pin: {
        soft: 'border-pin/20 bg-pin/20 text-pin-fg hover:bg-pin/30',
        overlayActive: 'bg-pin text-pin-contrast hover:bg-pin-hover',
        overlayInactive: {
            card: 'bg-stage-control text-on-stage/75 hover:bg-pin hover:text-pin-contrast',
            item: 'bg-stage-control-muted text-on-stage/70 hover:bg-pin hover:text-pin-contrast',
        },
    },
    discard: {
        soft: 'border-discard/25 bg-discard/25 text-discard-fg hover:bg-discard/40',
        overlayActive: 'bg-discard text-discard-contrast hover:bg-discard-hover',
        overlayInactive: {
            card: 'bg-stage-control text-on-stage/75 hover:bg-discard hover:text-discard-contrast',
            item: 'bg-stage-control-muted text-on-stage/70 hover:bg-discard hover:text-discard-contrast',
        },
    },
} as const
