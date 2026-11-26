import { For, Show } from 'solid-js'

import { Line } from '#/components/base/Line'
import { Loading } from '#/components/base/Loading'
import { DetailGroup, DetailLabel, DetailSection } from '#/components/detail'
import { Select } from '#/components/field'
import { t } from '#/lib/i18n'
import { fieldGroups, generatorFieldLabel } from '#/pages/workflow/generator-field'
import { useWorkflowStore } from '#/pages/workflow/state/store'

import type { GeneratorField, Mapping } from '@silent-pix/shared'
import type { SelectOption } from '#/components/field'
import type { WorkflowNodeOption } from '#/pages/workflow/node-option'
import type { Accessor } from 'solid-js'

const unboundValue = ''

/* 對應 TaskConfig：右欄的設定區，分組順序見 pages/workflow/generator-field.ts */
export function WorkflowMapping() {
    const page = useWorkflowStore()
    const configSchema = page.form.useSelector(state => state.values.configSchema)
    const isLoading = page.isDetailLoading

    return (
        <DetailSection
            title={t('workflow.mapping.title')}
            inert={isLoading()}
        >
            <div class='grid grid-cols-[128px_1fr_168px] items-center gap-2 text-xs leading-none text-fg-muted'>
                <span>{t('workflow.mapping.field')}</span>
                <span>{t('workflow.mapping.node')}</span>
                <span>{t('workflow.mapping.input')}</span>
            </div>

            <For each={fieldGroups}>
                {(group, index) => (
                    <>
                        <Show when={index() > 0}>
                            <Line />
                        </Show>
                        <DetailGroup title={group.label()}>
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
                        </DetailGroup>
                    </>
                )}
            </For>
        </DetailSection>
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
        <div class='grid grid-cols-[128px_1fr_168px] items-center gap-2'>
            <DetailLabel>{fieldLabel()}</DetailLabel>

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
        </div>
    )
}
