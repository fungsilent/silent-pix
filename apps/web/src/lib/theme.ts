
export const theme = {
    field: {
        disabled: 'disabled:cursor-default disabled:border-line-subtle disabled:bg-disabled disabled:text-fg-muted',
        disabledData: 'data-[disabled]:cursor-default data-[disabled]:border-line-subtle data-[disabled]:bg-disabled data-[disabled]:text-fg-muted',
    },
    selected: 'bg-active text-fg shadow-inset hover:bg-active',
    /*
     * Flag 分兩件事：縮圖左上的角摺是「狀態」，常駐且不可點；
     * 行右端的兩顆是「操作」，只在 hover 整張卡／整列時出現。
     *
     * fold 疊在照片上，所以吃 base（兩個 theme 同值）；active 是實心色塊，icon 才吃 ink。
     * discard 另外壓一層黑幕把照片壓暗——亮照片會吃掉霧藍角摺，壓暗同時解決辨識與語意。
     * soft 疊在 chrome 上，只有它需要隨 theme 走的 -fg。
     * inactive 一律中性 ghost，顏色只在 active 出現。
     */
    taskFlag: {
        pin: {
            fold: 'border-t-pin',
            active: 'bg-pin text-pin-ink hover:bg-pin-hover',
            soft: 'border-pin/22 bg-pin/22 text-pin-fg hover:bg-pin/32',
        },
        discard: {
            fold: 'border-t-discard',
            active: 'bg-discard text-discard-ink hover:bg-discard-hover',
            soft: 'border-discard/22 bg-discard/22 text-discard-fg hover:bg-discard/32',
        },
        inactive: 'bg-transparent text-fg-muted hover:bg-hover',
    },
} as const
