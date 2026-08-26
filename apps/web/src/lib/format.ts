/*
 * 一律 24 小時制。三個地方都在顯示同一種東西（建立時間），
 * 各自呼叫 toLocaleString() 的話遲早會有人拿到 AM/PM。
 */
export function formatDateTime(value: number | string): string {
    return new Date(value).toLocaleString(undefined, { hourCycle: 'h23' })
}
