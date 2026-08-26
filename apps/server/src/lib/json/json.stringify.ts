/*
 * Canonical JSON：同結構必得同字串，用來判斷「這次存檔有沒有真的改到東西」。
 * JSON.stringify() 直接比會受 key 插入順序影響——同一份 graph 換個順序序列化就不同，
 * revision 會被無謂地推高。所以遞迴排序物件的 key，陣列順序保持原樣（那是有意義的）。
 */
export function stringify(value: unknown): string {
    return JSON.stringify(normalize(value))
}

function normalize(value: unknown): unknown {
    if (Array.isArray(value)) {
        return value.map(normalize)
    }

    if (!value || typeof value !== 'object') {
        return value
    }

    const source = value as Record<string, unknown>
    const result: Record<string, unknown> = {}

    for (const key of Object.keys(source).sort()) {
        result[key] = normalize(source[key])
    }

    return result
}
