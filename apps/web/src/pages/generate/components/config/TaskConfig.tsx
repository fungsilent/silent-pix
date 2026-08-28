import { Undo2 } from 'lucide-solid'
import { createEffect, Show } from 'solid-js'

import { Button } from '#/components/base/Button'
import { FieldHint } from '#/components/base/FieldHint'
import { DetailSection } from '#/components/detail'
import { Number, Select, Text } from '#/components/field'
import { useSamplerListQuery } from '#/features/task/task.query'
import { useWorkflowListQuery } from '#/features/workflow/workflow.query'
import { useGenerateStore } from '#/pages/generate/store'

import type { TaskDetailMode } from '#/pages/generate/components/config/TaskDetailMode'
import type { GenerateTask } from '#/pages/generate/form'

type TaskConfigProps = {
    mode: TaskDetailMode
    task: GenerateTask
}

export function TaskConfig(props: TaskConfigProps) {
    const store = useGenerateStore()
    const form = store.form
    const samplerQuery = useSamplerListQuery()
    const workflowQuery = useWorkflowListQuery()
    const samplerOptions = () => samplerQuery.data?.options ?? []
    const workflowId = form.useSelector(({ values }) => values.workflowId)
    const hasReference = form.useSelector(({ values }) => values.referenceImage !== null)
    const isView = () => props.mode === 'view'
    const workflowOptions = () => workflowQuery.data?.options.map(workflow => ({
        label: workflow.name,
        value: workflow.id,
    })) ?? []

    createEffect(() => {
        if (workflowId()) {
            return
        }

        const firstWorkflow = workflowOptions()[0]
        if (firstWorkflow) {
            form.setFieldValue('workflowId', firstWorkflow.value)
        }
    })

    return (
        <DetailSection title='Config'>

            <form.Field name='workflowId'>
                {field => (
                    <Select
                        label='Workflow Template'
                        value={field().state.value}
                        options={workflowOptions()}
                        disabled={isView() || workflowQuery.isLoading || workflowQuery.isError || workflowOptions().length === 0}
                        onChange={field().handleChange}
                    />
                )}
            </form.Field>

            {/* 錯誤與空狀態改由 PromptPanel 的 issue chip 統一顯示 */}
            <Show when={workflowQuery.isLoading}>
                <FieldHint>Loading workflows...</FieldHint>
            </Show>

            <form.Field name='seed'>
                {field => (
                    <Text
                        label='Seed'
                        value={field().state.value}
                        placeholder={props.task.config.seed ?? 'Random'}
                        disabled={isView()}
                        onInput={field().handleChange}
                        action={(
                            <Button
                                disabled={isView() || !props.task.config.seed}
                                classes={{ root: 'size-8 p-0' }}
                                onClick={() => {
                                    if (props.task.config.seed) {
                                        field().handleChange(props.task.config.seed)
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
                )}
            </form.Field>

            <div class='grid min-w-0 grid-cols-2 gap-2'>
                <form.Field name='steps'>
                    {field => (
                        <Number
                            label='Steps'
                            min={1}
                            max={100}
                            value={field().state.value}
                            disabled={isView()}
                            onChange={field().handleChange}
                        />
                    )}
                </form.Field>
                <form.Field name='cfg'>
                    {field => (
                        <Number
                            label='CFG'
                            min={0}
                            max={100}
                            value={field().state.value}
                            disabled={isView()}
                            onChange={field().handleChange}
                        />
                    )}
                </form.Field>
            </div>

            <div class='grid min-w-0 grid-cols-2 gap-2'>
                <form.Field name='width'>
                    {field => (
                        <Number
                            label='Width'
                            min={64}
                            max={4096}
                            disabled={isView() || hasReference()}
                            value={field().state.value}
                            onChange={field().handleChange}
                        />
                    )}
                </form.Field>
                <form.Field name='height'>
                    {field => (
                        <Number
                            label='Height'
                            min={64}
                            max={4096}
                            disabled={isView() || hasReference()}
                            value={field().state.value}
                            onChange={field().handleChange}
                        />
                    )}
                </form.Field>
            </div>

            <form.Field name='batch'>
                {field => (
                    <Number
                        label='Batch'
                        min={1}
                        max={16}
                        disabled={isView() || hasReference()}
                        value={field().state.value}
                        onChange={field().handleChange}
                    />
                )}
            </form.Field>
            <form.Field name='sampler'>
                {field => (
                    <Select
                        label='Sampler'
                        value={field().state.value}
                        options={samplerOptions()}
                        disabled={isView() || samplerQuery.isLoading || samplerQuery.isError || samplerOptions().length === 0}
                        onChange={field().handleChange}
                    />
                )}
            </form.Field>
            <Show when={samplerQuery.isLoading}>
                <FieldHint>Loading samplers...</FieldHint>
            </Show>
        </DetailSection>
    )
}
