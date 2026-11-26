import { createSignal, onCleanup } from 'solid-js'

/* 設定一個值，duration 毫秒後清除；重設時取消前一個計時器，卸載時清理。用於複製回饋與短暫標亮 */
export function createTimedValue<T>(duration = 1500) {
    const [value, setValue] = createSignal<T>()
    let timer: number | undefined

    const clear = () => {
        window.clearTimeout(timer)
        setValue(undefined)
    }

    const show = (next: T) => {
        setValue(() => next)
        window.clearTimeout(timer)
        timer = window.setTimeout(() => setValue(undefined), duration)
    }

    onCleanup(() => window.clearTimeout(timer))

    return { value, show, clear }
}
