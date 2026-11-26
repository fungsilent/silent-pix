import { createEffect, createSignal, onCleanup, onMount } from 'solid-js'

import { isEditableTarget } from '#/lib/keyboard'
import { overlayStore } from '#/store/overlay'

import type { TaskApi } from '@silent-pix/shared'
import type { Accessor } from 'solid-js'

export const taskSelectionLimit = 200

type TaskBrowserSelectionOptions = {
    tasks: Accessor<TaskApi.TaskListItem[]>
    taskById: Accessor<Map<string, TaskApi.TaskListItem>>
    /* feed 已有資料；還沒載入時不剔除選取 */
    loaded: Accessor<boolean>
    viewerOpen: Accessor<boolean>
}

/* Task browser 的勾選：上限與 warning、清單變動時剔除、Esc 取消 */
export function createTaskBrowserSelection(options: TaskBrowserSelectionOptions) {
    const [selectedTaskIds, setSelectedTaskIds] = createSignal<string[]>([])
    const [selectionLimitWarning, setSelectionLimitWarning] = createSignal(false)

    /* Search/filter can make a selected card leave the loaded view. */
    createEffect(() => {
        const visibleIds = new Set(options.tasks().map(task => task.id))

        setSelectedTaskIds(current => {
            const next = current.filter(id => visibleIds.has(id))
            return next.length === current.length ? current : next
        })
    })

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
    const handleKeyDown = (event: KeyboardEvent) => {
        if (overlayStore.isActive() || options.viewerOpen() || event.defaultPrevented || isEditableTarget(event.target)) {
            return
        }

        if (event.key === 'Escape' && selectedTaskIds().length > 0) {
            event.preventDefault()
            clear()
        }
    }

    onMount(() => window.addEventListener('keydown', handleKeyDown))
    onCleanup(() => window.removeEventListener('keydown', handleKeyDown))

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
