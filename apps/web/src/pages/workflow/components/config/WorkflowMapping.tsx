import { For, Show } from 'solid-js'

import { Line } from '#/components/base/Line'
import { DetailGroup, DetailLabel, DetailSection } from '#/components/detail'
import { Select } from '#/components/field'
import { fieldGroups } from '#/pages/workflow/generator-field'
import { useWorkflowStore } from '#/pages/workflow/store'

import type { Comfy, GeneratorField, Mapping } from '@silent-pix/shared'

const unboundValue = ''

/* 對應 TaskConfig：右欄的設定區，分組順序見 pages/workflow/generator-field.ts */
export function WorkflowMapping() {
    const store = useWorkflowStore()

    return (
        <DetailSection title='Mapping'>
            <div class='grid grid-cols-[112px_1fr_168px] items-center gap-2 text-xs leading-none text-fg-muted'>
                <span>Field</span>
                <span>Node</span>
                <span>Input</span>
            </div>

            <For each={fieldGroups}>
                {(group, index) => (
                    <>
                        <Show when={index() > 0}>
                            <Line />
                        </Show>
                        <DetailGroup title={group.label}>
                            <For each={group.fields}>
                                {field => (
                                    <MappingRow
                                        field={field}
                                        binding={store.selection().configSchema[field]}
                                        nodeOptions={store.graphState().nodeOptions}
                                        readOnly={store.selection().isArchived}
                                        onChange={(target, value) => store.setMapping(target, value)}
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
    nodeOptions: Comfy.NodeOption[]
    readOnly: boolean
    onChange: (field: GeneratorField, value: Mapping | undefined) => void
}

function MappingRow(props: MappingRowProps) {
    const selectedNode = () => props.nodeOptions.find(option => option.nodeId === props.binding?.nodeId)

    /*
     * 綁到一個已經不在 graph 裡的節點時，下拉仍要顯示那個 id —— 使用者得看得到
     * 自己綁的是什麼，才知道要改成什麼。所以缺的節點補成一個一次性的選項。
     */
    const nodeItems = () => {
        const options = props.nodeOptions.map(option => ({
            label: `${option.nodeId} · ${option.label}`,
            value: option.nodeId,
        }))
        const nodeId = props.binding?.nodeId

        if (nodeId && !selectedNode()) {
            options.unshift({ label: `${nodeId} · missing`, value: nodeId })
        }

        return [{ label: 'Not bound', value: unboundValue }, ...options]
    }

    const inputItems = () => {
        const inputs = selectedNode()?.inputs ?? []
        const options = inputs.map(input => ({ label: input, value: input }))
        const input = props.binding?.input

        if (input && !inputs.includes(input)) {
            options.unshift({ label: input, value: input })
        }

        return options
    }

    const changeNode = (value: string) => {
        if (value === unboundValue) {
            props.onChange(props.field, undefined)
            return
        }

        const node = props.nodeOptions.find(option => option.nodeId === value)
        /* 換節點就換一個該節點真的有的 input，不然會留下一個必定失效的綁定 */
        const input = node?.inputs[0] ?? props.binding?.input ?? ''

        props.onChange(props.field, { nodeId: value, input })
    }

    return (
        <div class='grid grid-cols-[112px_1fr_168px] items-center gap-2'>
            <DetailLabel>{props.field}</DetailLabel>

            <Select
                label={`${props.field} node`}
                value={props.binding?.nodeId ?? unboundValue}
                options={nodeItems()}
                disabled={props.readOnly}
                onChange={changeNode}
                classes={{ label: 'sr-only' }}
            />

            <Show
                when={props.binding}
                fallback={<div class='h-8 rounded-md border border-dashed border-line' />}
            >
                {binding => (
                    <Select
                        label={`${props.field} input`}
                        value={binding().input}
                        options={inputItems()}
                        disabled={props.readOnly}
                        onChange={value => props.onChange(props.field, { nodeId: binding().nodeId, input: value })}
                        classes={{ label: 'sr-only' }}
                    />
                )}
            </Show>
        </div>
    )
}
