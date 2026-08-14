import { RefreshCcw, Undo2 } from 'lucide-solid'
import { createEffect, Show } from 'solid-js'

import { Button } from '#/components/base/Button'
import { SectionTitle } from '#/components/base/SectionTitle'
import { Number, Select, Text } from '#/components/field'
import { useSamplerListQuery, useWorkflowListQuery } from '#/features/task/task.query'
import { useGenerateStore } from '#/pages/generate/store'

import type { GenerateTask } from '#/pages/generate/store'

type TaskConfigProps = {
    task: GenerateTask
}

export function TaskConfig(props: TaskConfigProps) {
    const store = useGenerateStore()
    const samplerQuery = useSamplerListQuery()
    const workflowQuery = useWorkflowListQuery()
    const samplerOptions = () => samplerQuery.data?.options ?? []
    const workflowOptions = () => workflowQuery.data?.options.map(workflow => ({
        label: workflow.name,
        value: workflow.id,
    })) ?? []

    createEffect(() => {
        if (store.state.values.workflowId) {
            return
        }

        const firstWorkflow = workflowOptions()[0]
        if (firstWorkflow) {
            store.setValue('workflowId', firstWorkflow.value)
        }
    })

    return (
        <section class='flex flex-col gap-3'>
            <div class='flex flex-col gap-1 py-1'>
                <SectionTitle>Config</SectionTitle>
            </div>

            <div class='flex min-w-0 items-end gap-2'>
                <Select
                    label='Workflow Template'
                    value={store.state.values.workflowId}
                    options={workflowOptions()}
                    disabled={workflowQuery.isLoading || workflowQuery.isError || workflowOptions().length === 0}
                    onChange={value => store.setValue('workflowId', value)}
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

            {/* 錯誤與空狀態改由 PromptPanel 的 issue chip 統一顯示 */}
            <Show when={workflowQuery.isLoading}>
                <p class='m-0 text-xs text-fg-muted'>Loading workflows...</p>
            </Show>

            <Text
                label='Seed'
                value={store.state.values.seed}
                placeholder={props.task.config.seed ?? 'Random'}
                onInput={value => store.setValue('seed', value)}
                action={(
                    <Button
                        disabled={!props.task.config.seed}
                        classes={{ root: 'h-8 w-8 p-0' }}
                        onClick={() => {
                            if (props.task.config.seed) {
                                store.setValue('seed', props.task.config.seed)
                            }
                        }}
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
                    min={1}
                    max={100}
                    value={store.state.values.steps}
                    onChange={value => store.setValue('steps', value)}
                />
                <Number
                    label='CFG'
                    min={0}
                    max={100}
                    value={store.state.values.cfg}
                    onChange={value => store.setValue('cfg', value)}
                />
            </div>

            <div class='grid min-w-0 grid-cols-2 gap-2'>
                <Number
                    label='Width'
                    min={64}
                    max={4096}
                    value={store.state.values.width}
                    onChange={value => store.setValue('width', value)}
                />
                <Number
                    label='Height'
                    min={64}
                    max={4096}
                    value={store.state.values.height}
                    onChange={value => store.setValue('height', value)}
                />
            </div>

            <Number
                label='Batch'
                min={1}
                max={16}
                value={store.state.values.batch}
                onChange={value => store.setValue('batch', value)}
            />
            <Select
                label='Sampler'
                value={store.state.values.sampler}
                options={samplerOptions()}
                disabled={samplerQuery.isLoading || samplerQuery.isError || samplerOptions().length === 0}
                onChange={value => store.setValue('sampler', value)}
            />
            <Show when={samplerQuery.isLoading}>
                <p class='m-0 text-xs text-fg-muted'>Loading samplers...</p>
            </Show>
        </section>
    )
}
