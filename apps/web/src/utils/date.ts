import { format } from 'date-fns'

/* 建立時間一律 YYYY-MM-DD 與 24 小時制（本地時區），不跟語系 */
export function formatDateTime(value: number | string): string {
    return format(value, 'yyyy-MM-dd HH:mm:ss')
}

export function formatDate(value: number | string): string {
    return format(value, 'yyyy-MM-dd')
}

export function formatTime(value: number | string): string {
    return format(value, 'HH:mm:ss')
}
