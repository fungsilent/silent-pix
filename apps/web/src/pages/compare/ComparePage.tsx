import { Show } from 'solid-js'

import { ImagePickerDialog } from '#/components/image/ImagePickerDialog'
import { CompareDetail } from '#/pages/compare/components/CompareDetail'
import { CompareWorkspace } from '#/pages/compare/components/CompareWorkspace'
import { CompareMobileLayout } from '#/pages/compare/components/mobile/CompareMobileLayout'
import { createCompareView } from '#/pages/compare/hooks/createCompareView'
import { useCompareSession } from '#/pages/compare/state/session'
import { appStore } from '#/store/app'

export function ComparePage() {
    const compareSession = useCompareSession()
    const view = createCompareView()

    return (
        <>
            <Show
                when={!appStore.state.mobile}
                fallback={<CompareMobileLayout view={view} />}
            >
                <div class='flex min-h-0 flex-1 gap-1 overflow-hidden'>
                    <CompareWorkspace view={view} />
                    <Show when={compareSession.visibleCompare().length > 0}>
                        <CompareDetail />
                    </Show>
                </div>
            </Show>
            <ImagePickerDialog
                mode='multiple'
                open={view.pickerOpen()}
                disabledImageIds={view.allEntries().map(entry => entry.image.id)}
                onOpenChange={view.setPickerOpen}
                onSelect={view.applyPickerSelection}
            />
        </>
    )
}
