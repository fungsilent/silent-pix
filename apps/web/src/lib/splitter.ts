/*
 * 拖曳分隔的尺寸計算。全部是純函式：輸入拖曳開始時的尺寸與相對起點的位移，
 * 輸出新尺寸，夾在上下限內。量測 DOM 與寫回狀態由呼叫端負責。
 */

function clamp(value: number, min: number, max: number): number {
    return Math.min(Math.max(value, min), max)
}

/* 兩段之間：總和不變，只改比例；兩段都不小於 min */
export function splitPair(start: readonly [number, number], delta: number, min: number): [number, number] {
    const total = start[0] + start[1]
    const first = clamp(start[0] + delta, min, total - min)
    return [first, total - first]
}

/* 兩段平分目前的總和 */
export function evenPair(sizes: readonly [number, number]): [number, number] {
    const half = (sizes[0] + sizes[1]) / 2
    return [half, half]
}

type ScaleOptions = {
    /* 每段的下限 */
    min: number
    /* 總和最多還能長多少（例如相鄰區塊能讓出的空間） */
    maxGrow: number
}

/*
 * 整組一起縮放：總和加上位移，依起始比例分配給每段；縮到每段 min 為止，長到 maxGrow 為止。
 * 按比例會低於 min 的段落先固定在 min，剩下的高度再依比例分給其他段落，總和才會剛好等於目標。
 */
export function scaleGroup<K extends string>(start: Record<K, number>, delta: number, options: ScaleOptions): Record<K, number> {
    const keys = Object.keys(start) as K[]
    const total = keys.reduce((sum, key) => sum + start[key], 0)
    let remaining = total + clamp(delta, keys.length * options.min - total, Math.max(options.maxGrow, 0))
    let free = keys
    const result = {} as Record<K, number>

    while (free.length > 0) {
        const freeTotal = free.reduce((sum, key) => sum + start[key], 0)
        const atMin = free.filter(key => start[key] / freeTotal * remaining < options.min)

        if (atMin.length === 0) {
            for (const key of free) {
                result[key] = start[key] / freeTotal * remaining
            }
            break
        }

        for (const key of atMin) {
            result[key] = options.min
            remaining -= options.min
        }
        free = free.filter(key => !atMin.includes(key))
    }

    return result
}
