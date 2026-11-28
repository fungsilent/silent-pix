import { MobileSheet } from '#/components/mobile/MobileSheet'
import { GenerateTaskDetail } from '#/pages/generate/components/config/GenerateTaskDetail'
import { MobilePrompt } from '#/pages/generate/components/mobile/MobilePrompt'
import { GenerateStage } from '#/pages/generate/components/workspace/GenerateStage'

export function MobileTaskView(props: { inert: boolean }) {
    return (
        <MobileSheet
            inert={props.inert}
            stage={stage => (
                <GenerateStage
                    class={stage.class}
                    onSurfaceClick={stage.onSurfaceClick}
                    fit={stage.fit}
                />
            )}
        >
            <MobilePrompt />
            <div class='mx-4 my-1 border-t border-line-subtle' />
            <div class='flex flex-col gap-3 px-4 pt-3 pb-5'>
                <GenerateTaskDetail bare />
            </div>
        </MobileSheet>
    )
}
