import { Undo2 } from 'lucide-solid'
import { createEffect } from 'solid-js'

import { Button } from '#/components/base/Button'
import { Loading } from '#/components/base/Loading'
import { DetailSection } from '#/components/detail'
import { Number, Select, Text } from '#/components/field'
import { useSamplerListQuery } from '#/features/task/task.query'
import { useWorkflowListQuery } from '#/features/workflow/workflow.query'
import { useGenerateDetail } from '#/pages/generate/detail'
import { useGenerateStore } from '#/pages/generate/store'

import type { TaskDetailMode } from '#/pages/generate/components/config/TaskDetailMode'

type TaskConfigProps = {
    mode: TaskDetailMode
}

export function TaskConfig(props: TaskConfigProps) {
    const store = useGenerateStore()
    const detail = useGenerateDetail()
    const form = store.form
    const samplerQuery = useSamplerListQuery()
    const workflowQuery = useWorkflowListQuery()
    const samplerOptions = () => samplerQuery.data?.options ?? []
    const workflowId = form.useSelector(({ values }) => values.workflowId)
    const hasReference = form.useSelector(({ values }) => values.referenceImage !== null)
    const isView = () => props.mode === 'view'
    const isTaskLoading = detail.loading
    const isWorkflowLoading = () => workflowQuery.isLoading
    const isSamplerLoading = () => samplerQuery.isLoading
    const isDraft = () => detail.task()?.status === null
    const activeOptions = () => workflowQuery.data?.options
        .filter(workflow => workflow.archivedAt === null)
        .map(workflow => ({ label: workflow.name, value: workflow.id })) ?? []

    const workflowOptions = () => {
        const options = activeOptions()
        const current = workflowId()

        if (!current || options.some(option => option.value === current)) {
            return options
        }

        const archived = workflowQuery.data?.options.find(workflow => workflow.id === current)

        return archived
            ? [{ badge: 'archived', label: archived.name, value: archived.id }, ...options]
            : options
    }

    createEffect(() => {
        if (isView() || !isDraft()) {
            return
        }

        const options = activeOptions()
        const first = options[0]

        if (!first) {
            return
        }

        const current = workflowId()

        if (current && options.some(option => option.value === current)) {
            return
        }

        form.setFieldValue('workflowId', first.value)
    })

    return (
        <DetailSection
            title='Config'
            inert={isTaskLoading()}
        >
            <form.Field name='workflowId'>
                {field => (
                    <Loading.Control loading={() => isTaskLoading() || isWorkflowLoading()}>
                        <Select
                            label='Workflow Template'
                            value={field().state.value}
                            options={workflowOptions()}
                            badgeTone='amber'
                            disabled={isView() || isWorkflowLoading() || workflowQuery.isError || workflowOptions().length === 0}
                            onChange={field().handleChange}
                        />
                    </Loading.Control>
                )}
            </form.Field>

            <form.Field name='seed'>
                {field => (
                    <Loading.Control loading={isTaskLoading}>
                        <Text
                            label='Seed'
                            value={field().state.value}
                            placeholder={detail.task()?.config.seed ?? 'Random'}
                            disabled={isView()}
                            onInput={field().handleChange}
                            action={(
                                <Button
                                    disabled={isView() || !detail.task()?.config.seed}
                                    classes={{ root: 'size-8 p-0' }}
                                    onClick={() => {
                                        const seed = detail.task()?.config.seed

                                        if (seed) {
                                            field().handleChange(seed)
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
                    </Loading.Control>
                )}
            </form.Field>

            <div class='grid min-w-0 grid-cols-2 gap-2'>
                <form.Field name='steps'>
                    {field => (
                        <Loading.Control loading={isTaskLoading}>
                            <Number
                                label='Steps'
                                min={1}
                                max={100}
                                value={field().state.value}
                                disabled={isView()}
                                onChange={field().handleChange}
                            />
                        </Loading.Control>
                    )}
                </form.Field>
                <form.Field name='cfg'>
                    {field => (
                        <Loading.Control loading={isTaskLoading}>
                            <Number
                                label='CFG'
                                min={0}
                                max={100}
                                value={field().state.value}
                                disabled={isView()}
                                onChange={field().handleChange}
                            />
                        </Loading.Control>
                    )}
                </form.Field>
            </div>

            <div class='grid min-w-0 grid-cols-2 gap-2'>
                <form.Field name='width'>
                    {field => (
                        <Loading.Control loading={isTaskLoading}>
                            <Number
                                label='Width'
                                min={64}
                                max={4096}
                                disabled={isView() || hasReference()}
                                value={field().state.value}
                                onChange={field().handleChange}
                            />
                        </Loading.Control>
                    )}
                </form.Field>
                <form.Field name='height'>
                    {field => (
                        <Loading.Control loading={isTaskLoading}>
                            <Number
                                label='Height'
                                min={64}
                                max={4096}
                                disabled={isView() || hasReference()}
                                value={field().state.value}
                                onChange={field().handleChange}
                            />
                        </Loading.Control>
                    )}
                </form.Field>
            </div>

            <form.Field name='batch'>
                {field => (
                    <Loading.Control loading={isTaskLoading}>
                        <Number
                            label='Batch'
                            min={1}
                            max={16}
                            value={field().state.value}
                            disabled={isView() || hasReference()}
                            onChange={field().handleChange}
                        />
                    </Loading.Control>
                )}
            </form.Field>

            <form.Field name='sampler'>
                {field => (
                    <Loading.Control loading={() => isTaskLoading() || isSamplerLoading()}>
                        <Select
                            label='Sampler'
                            value={field().state.value}
                            options={samplerOptions()}
                            disabled={isView() || isSamplerLoading() || samplerQuery.isError || samplerOptions().length === 0}
                            onChange={field().handleChange}
                        />
                    </Loading.Control>
                )}
            </form.Field>
        </DetailSection>
    )
}
