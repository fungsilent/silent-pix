import { getPlatform } from '#/lib/platform'
import { mergeClasses } from '#/utils/style'

let root: HTMLElement | undefined

/*
 * 所有疊加層（Image viewer、Dialog）共用的區域：
 * Web 蓋滿整個視窗。
 * Desktop 從標題列（Header h-9）下方開始，讓拖曳與視窗控制一直可用。
 */
export function overlayRoot(): HTMLElement {
    if (!root) {
        root = document.createElement('div')
        root.className = mergeClasses(
            'pointer-events-none fixed inset-x-0 bottom-0 z-50',
            getPlatform().kind === 'desktop' ? 'top-9' : 'top-0',
        )
        document.body.append(root)
    }

    return root
}
