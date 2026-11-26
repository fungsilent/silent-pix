import { createEffect, createSignal } from 'solid-js'

import { createHotkeys } from '#/lib/keyboard'
import { overlayStore } from '#/store/overlay'

import type { TaskApi } from '@silent-pix/shared'
import type { Accessor } from 'solid-js'

export const taskSelectionLimit = 200

type TaskBrowserSelectionOptions = {
    taskById: Accessor<Map<string, TaskApi.TaskListItem>>
    loaded: Accessor<boolean>
    viewerOpen: Accessor<boolean>
}

/* Task browser 的勾選：上限與 warning、清單變動時剔除、Esc 取消 */
export function createTaskBrowserSelection(options: TaskBrowserSelectionOptions) {
    const [selectedTaskIds, setSelectedTaskIds] = createSignal<string[]>([])
    const [selectionLimitWarning, setSelectionLimitWarning] = createSignal(false)

    createEffect(() => {
        if (selectedTaskIds().length < taskSelectionLimit) {
            setSelectionLimitWarning(false)
        }
    })

    const clear = () => {
        setSelectedTaskIds([])
        setSelectionLimitWarning(false)
    }

    /* Esc 取消勾選；有 overlay 或焦點在輸入框時不攔 */
    createHotkeys([
        { key: 'Escape', modifiers: 'any', preventDefault: true, when: () => selectedTaskIds().length > 0, onPress: clear },
    ], () => !overlayStore.isActive() && !options.viewerOpen())

    const applyDrag = (ids: string[]) => {
        if (ids.length > taskSelectionLimit) {
            setSelectionLimitWarning(true)
            setSelectedTaskIds(ids.slice(0, taskSelectionLimit))
            return
        }

        setSelectedTaskIds(ids)
    }

    const toggle = (taskId: string) => {
        const current = selectedTaskIds()
        if (current.includes(taskId)) {
            setSelectedTaskIds(current.filter(id => id !== taskId))
            return
        }

        if (current.length >= taskSelectionLimit) {
            setSelectionLimitWarning(true)
            return
        }

        setSelectedTaskIds([...current, taskId])
    }

    /* 移除已刪除的 task */
    const remove = (taskIds: string[]) => {
        const removedIds = new Set(taskIds)
        setSelectedTaskIds(current => current.filter(taskId => !removedIds.has(taskId)))
        setSelectionLimitWarning(false)
    }

    createEffect(() => {
        if (!options.loaded()) return

        const loaded = options.taskById()
        const current = selectedTaskIds()
        const kept = current.filter(taskId => loaded.has(taskId))

        if (kept.length !== current.length) {
            setSelectedTaskIds(kept)
        }
    })

    return { selectedTaskIds, selectionLimitWarning, applyDrag, toggle, clear, remove }
}
