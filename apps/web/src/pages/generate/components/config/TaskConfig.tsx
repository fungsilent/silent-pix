import { RefreshCcw, Undo2 } from 'lucide-solid'

import { Button } from '#/components/base/Button'
import { Number, Select, Text } from '#/components/field'
import { useGenerateStore } from '#/pages/generate/store'
import { samplers, workflows } from '#/temp/task'

import type { TaskDetail } from '#/temp/task'

type TaskConfigProps = {
    task: TaskDetail
}

export function TaskConfig(props: TaskConfigProps) {
    const store = useGenerateStore()

    return (
        <section class='flex flex-col gap-3'>
            <div class='flex flex-col gap-1 py-1'>
                <h3 class='m-0 text-sm font-bold leading-none text-white'>Config</h3>
            </div>

            <div class='flex min-w-0 items-end gap-2'>
                <Select
                    label='Workflow Template'
                    value={store.state.values.workflow}
                    options={workflows}
                    onChange={value => store.setValue('workflow', value)}
                    classes={{
                        root: 'flex-1',
                    }}
                />
                <Button
                    aria-label='Reset config'
                    classes={{ root: 'h-8 w-8 p-0' }}
                    onClick={store.resetConfig}
                >
                    <RefreshCcw
                        size={13}
                        strokeWidth={2}
                        aria-hidden='true'
                    />
                </Button>
            </div>

            <Text
                label='Seed'
                value={store.state.values.seed}
                placeholder={props.task.config.seed}
                onInput={value => store.setValue('seed', value)}
                action={(
                    <Button
                        classes={{ root: 'h-8 w-8 p-0' }}
                        onClick={() => store.setValue('seed', props.task.config.seed)}
                    >
                        <Undo2
                            size={13}
                            strokeWidth={2}
                            aria-hidden='true'
                        />
                    </Button>
                )}
            />

            <div class='grid min-w-0 grid-cols-2 gap-2'>
                <Number
                    label='Steps'
                    min={0}
                    max={50}
                    value={store.state.values.steps}
                    onChange={value => store.setValue('steps', value)}
                />
                <Number
                    label='CFG'
                    min={0}
                    max={20}
                    value={store.state.values.cfg}
                    onChange={value => store.setValue('cfg', value)}
                />
            </div>

            <div class='grid min-w-0 grid-cols-2 gap-2'>
                <Number
                    label='Width'
                    min={0}
                    max={1536}
                    value={store.state.values.width}
                    onChange={value => store.setValue('width', value)}
                />
                <Number
                    label='Height'
                    min={0}
                    max={1536}
                    value={store.state.values.height}
                    onChange={value => store.setValue('height', value)}
                />
            </div>

            <Select
                label='Sampler'
                value={store.state.values.sampler}
                options={samplers}
                onChange={value => store.setValue('sampler', value)}
            />
        </section>
    )
}