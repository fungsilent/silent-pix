import { Undo2 } from 'lucide-solid'
import { createEffect, Show } from 'solid-js'

import { Button } from '#/components/base/Button'
import { Loading } from '#/components/base/Loading'
import { DetailSection } from '#/components/detail'
import { Number, Select, Text } from '#/components/field'

import type { SelectOption } from '#/components/field'
import type { Accessor } from 'solid-js'

export type TaskConfigValues = {
    workflowId: string
    seed: string
    seedPlaceholder: string
    steps: number
    cfg: number
    width: number
    height: number
    batch: number
    sampler: string
}

export type TaskConfigData = {
    values: Accessor<TaskConfigValues>
    workflowOptions: Accessor<SelectOption[]>
    samplerOptions: Accessor<SelectOption[]>
}

export type TaskConfigCreateData = TaskConfigData & {
    hasReference: Accessor<boolean>
    isDraft: Accessor<boolean>
    restorableSeed: Accessor<string | null>
    workflowLoading: Accessor<boolean>
    workflowError: Accessor<boolean>
    samplerLoading: Accessor<boolean>
    samplerError: Accessor<boolean>
}

export type TaskConfigActions = {
    onWorkflowChange: (value: string) => void
    onSeedChange: (value: string) => void
    onRestoreSeed: () => void
    onStepsChange: (value: number) => void
    onCfgChange: (value: number) => void
    onWidthChange: (value: number) => void
    onHeightChange: (value: number) => void
    onBatchChange: (value: number) => void
    onSamplerChange: (value: string) => void
}

type TaskConfigProps = {
    mode: 'create'
    data: TaskConfigCreateData
    actions: TaskConfigActions
    loading: Accessor<boolean>
} | {
    mode: 'view'
    data: TaskConfigData
    loading: Accessor<boolean>
}

export function TaskConfig(props: TaskConfigProps) {
    const isCreate = () => props.mode === 'create'
    const values = () => props.data.values()
    const workflowLoading = () => props.mode === 'create' ? props.data.workflowLoading() : false
    const workflowError = () => props.mode === 'create' ? props.data.workflowError() : false
    const samplerLoading = () => props.mode === 'create' ? props.data.samplerLoading() : false
    const samplerError = () => props.mode === 'create' ? props.data.samplerError() : false
    const hasReference = () => props.mode === 'create' ? props.data.hasReference() : false
    const restorableSeed = () => props.mode === 'create' ? props.data.restorableSeed() : null

    const onWorkflowChange = (value: string) => {
        if (props.mode === 'create') {
            props.actions.onWorkflowChange(value)
        }
    }

    const onSeedChange = (value: string) => {
        if (props.mode === 'create') {
            props.actions.onSeedChange(value)
        }
    }

    const onRestoreSeed = () => {
        if (props.mode === 'create') {
            props.actions.onRestoreSeed()
        }
    }

    const onStepsChange = (value: number) => {
        if (props.mode === 'create') {
            props.actions.onStepsChange(value)
        }
    }

    const onCfgChange = (value: number) => {
        if (props.mode === 'create') {
            props.actions.onCfgChange(value)
        }
    }

    const onWidthChange = (value: number) => {
        if (props.mode === 'create') {
            props.actions.onWidthChange(value)
        }
    }

    const onHeightChange = (value: number) => {
        if (props.mode === 'create') {
            props.actions.onHeightChange(value)
        }
    }

    const onBatchChange = (value: number) => {
        if (props.mode === 'create') {
            props.actions.onBatchChange(value)
        }
    }

    const onSamplerChange = (value: string) => {
        if (props.mode === 'create') {
            props.actions.onSamplerChange(value)
        }
    }

    createEffect(() => {
        if (props.mode !== 'create' || !props.data.isDraft()) {
            return
        }

        const options = props.data.workflowOptions()
        const first = options[0]

        if (!first) {
            return
        }

        const current = values().workflowId

        if (current && options.some(option => option.value === current)) {
            return
        }

        props.actions.onWorkflowChange(first.value)
    })

    return (
        <DetailSection
            title='Config'
            inert={props.loading()}
        >
            <Loading.Control loading={() => props.loading() || workflowLoading()}>
                <Select
                    label='Workflow Template'
                    value={values().workflowId}
                    options={props.data.workflowOptions()}
                    badgeTone='warning'
                    disabled={!isCreate() || workflowLoading() || workflowError() || props.data.workflowOptions().length === 0}
                    onChange={onWorkflowChange}
                />
            </Loading.Control>

            <Loading.Control loading={props.loading}>
                <Text
                    label='Seed'
                    value={values().seed}
                    placeholder={values().seedPlaceholder}
                    disabled={!isCreate()}
                    onInput={onSeedChange}
                    action={(
                        <Show when={isCreate()}>
                            <Button
                                disabled={!restorableSeed()}
                                classes={{ root: 'size-8 p-0' }}
                                onClick={onRestoreSeed}
                            >
                                <Undo2
                                    size={13}
                                    strokeWidth={2}
                                />
                            </Button>
                        </Show>
                    )}
                />
            </Loading.Control>

            <div class='grid min-w-0 grid-cols-2 gap-2'>
                <Loading.Control loading={props.loading}>
                    <Number
                        label='Steps'
                        min={1}
                        max={100}
                        value={values().steps}
                        disabled={!isCreate()}
                        onChange={onStepsChange}
                    />
                </Loading.Control>
                <Loading.Control loading={props.loading}>
                    <Number
                        label='CFG'
                        min={0}
                        max={100}
                        value={values().cfg}
                        disabled={!isCreate()}
                        onChange={onCfgChange}
                    />
                </Loading.Control>
            </div>

            <div class='grid min-w-0 grid-cols-2 gap-2'>
                <Loading.Control loading={props.loading}>
                    <Number
                        label='Width'
                        min={64}
                        max={4096}
                        value={values().width}
                        disabled={!isCreate() || hasReference()}
                        onChange={onWidthChange}
                    />
                </Loading.Control>
                <Loading.Control loading={props.loading}>
                    <Number
                        label='Height'
                        min={64}
                        max={4096}
                        value={values().height}
                        disabled={!isCreate() || hasReference()}
                        onChange={onHeightChange}
                    />
                </Loading.Control>
            </div>

            <Loading.Control loading={props.loading}>
                <Number
                    label='Batch'
                    min={1}
                    max={16}
                    value={values().batch}
                    disabled={!isCreate() || hasReference()}
                    onChange={onBatchChange}
                />
            </Loading.Control>

            <Loading.Control loading={() => props.loading() || samplerLoading()}>
                <Select
                    label='Sampler'
                    value={values().sampler}
                    options={props.data.samplerOptions()}
                    disabled={!isCreate() || samplerLoading() || samplerError() || props.data.samplerOptions().length === 0}
                    onChange={onSamplerChange}
                />
            </Loading.Control>
        </DetailSection>
    )
}
