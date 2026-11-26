import { For, Show } from 'solid-js'

import { Line } from '#/components/base/Line'
import { Loading } from '#/components/base/Loading'
import { DetailLabel, DetailTitle } from '#/components/detail'
import { Select } from '#/components/field'
import { t } from '#/lib/i18n'
import { fieldGroups, generatorFieldLabel } from '#/pages/workflow/generator-field'
import { useWorkflowStore } from '#/pages/workflow/state/store'

import type { GeneratorField, Mapping } from '@silent-pix/shared'
import type { SelectOption } from '#/components/field'
import type { WorkflowNodeOption } from '#/pages/workflow/node-option'
import type { Accessor } from 'solid-js'

const unboundValue = ''

export function WorkflowMapping() {
    const page = useWorkflowStore()
    const configSchema = page.form.useSelector(state => state.values.configSchema)
    const isLoading = page.isDetailLoading

    return (
        <div
            class='grid grid-cols-[max-content_minmax(0,1fr)_136px] items-start gap-x-2 gap-y-3'
            inert={isLoading()}
        >
            <For each={fieldGroups}>
                {(group, index) => (
                    <>
                        <Show when={index() > 0}>
                            <div class='col-span-3'>
                                <Line />
                            </div>
                        </Show>
                        <div class='col-span-3 py-1'>
                            <DetailTitle>{group.label()}</DetailTitle>
                        </div>
                        <Show when={index() === 0}>
                            <DetailLabel>{t('workflow.mapping.field')}</DetailLabel>
                            <DetailLabel>{t('workflow.mapping.node')}</DetailLabel>
                            <DetailLabel>{t('workflow.mapping.input')}</DetailLabel>
                        </Show>
                        <For each={group.fields}>
                            {field => (
                                <MappingRow
                                    field={field}
                                    binding={configSchema()[field]}
                                    loading={isLoading}
                                    nodeOptions={page.graphState().nodeOptions}
                                    readOnly={page.isReadOnly()}
                                    onChange={(target, value) => page.setMapping(target, value)}
                                />
                            )}
                        </For>
                    </>
                )}
            </For>
        </div>
    )
}

type MappingRowProps = {
    field: GeneratorField
    binding: Mapping | undefined
    loading: Accessor<boolean>
    nodeOptions: WorkflowNodeOption[]
    readOnly: boolean
    onChange: (field: GeneratorField, value: Mapping | undefined) => void
}

function MappingRow(props: MappingRowProps) {
    const fieldLabel = () => generatorFieldLabel(props.field)
    const selectedNode = () => props.nodeOptions.find(option => option.nodeId === props.binding?.nodeId)

    /*
     * 綁到一個已經不在 graph 裡的節點時，下拉仍要顯示那個 id —— 使用者得看得到
     * 自己綁的是什麼，才知道要改成什麼。所以缺的節點補成一個一次性的選項。
     */
    const nodeItems = (): SelectOption[] => {
        const options: SelectOption[] = props.nodeOptions.map(option => ({
            label: `${option.nodeId} · ${option.label}`,
            value: option.nodeId,
        }))
        const nodeId = props.binding?.nodeId

        if (nodeId && !selectedNode()) {
            options.unshift({ badge: t('workflow.mapping.missing'), label: nodeId, value: nodeId })
        }

        return [{ label: t('workflow.mapping.unbound'), value: unboundValue }, ...options]
    }

    const inputItems = (): SelectOption[] => {
        const inputs = selectedNode()?.inputs ?? []
        const options: SelectOption[] = inputs.map(input => ({ label: input, value: input }))
        const input = props.binding?.input

        if (input && !inputs.includes(input)) {
            options.unshift({ badge: t('workflow.mapping.missing'), label: input, value: input })
        }

        return options
    }

    const changeNode = (value: string) => {
        if (value === unboundValue) {
            props.onChange(props.field, undefined)
            return
        }

        const node = props.nodeOptions.find(option => option.nodeId === value)
        const input = node?.inputs[0] ?? props.binding?.input ?? ''

        props.onChange(props.field, { nodeId: value, input })
    }

    return (
        <>
            <span class='flex h-7 min-w-0 items-center'>
                <DetailLabel>{fieldLabel()}</DetailLabel>
            </span>


            <Loading.Mask loading={props.loading}>
                <Select
                    label={t('workflow.mapping.nodeLabel', { field: fieldLabel() })}
                    value={props.binding?.nodeId ?? unboundValue}
                    options={nodeItems()}
                    disabled={props.readOnly}
                    onChange={changeNode}
                    badgeTone='danger'
                    classes={{ label: 'hidden' }}
                />
            </Loading.Mask>

            <Loading.Mask loading={props.loading}>
                <Show
                    when={props.binding}
                    fallback={<div class='h-7 rounded-md border border-dashed border-line' />}
                >
                    {binding => (
                        <Select
                            label={t('workflow.mapping.inputLabel', { field: fieldLabel() })}
                            value={binding().input}
                            options={inputItems()}
                            disabled={props.readOnly}
                            onChange={value => props.onChange(props.field, { nodeId: binding().nodeId, input: value })}
                            badgeTone='danger'
                            classes={{ label: 'hidden' }}
                        />
                    )}
                </Show>
            </Loading.Mask>
        </>
    )
}
