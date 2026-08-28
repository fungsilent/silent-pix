import { config, workflowApi } from '@silent-pix/shared'
import { createForm } from '@tanstack/solid-form'
import { z } from 'zod'

import type { Comfy, ConfigSchema } from '@silent-pix/shared'
import type { ZodIssue } from '#/lib/error'

export const workflowFormSchema = z.object({
    name: workflowApi.workflowName,
    graphText: z.string(),
    configSchema: config.configSchema,
})

export type WorkflowFormValues = z.output<typeof workflowFormSchema>

export const emptyWorkflowValues: WorkflowFormValues = {
    name: '',
    graphText: '',
    configSchema: {},
}

export type WorkflowRecord = {
    id: string
    name: string
    revision: number
    archivedAt: string | null
    taskCount: number
    graph: Comfy.Graph
    graphText: string
    configSchema: ConfigSchema
}

export function toWorkflowValues(record: WorkflowRecord): WorkflowFormValues {
    return {
        name: record.name,
        graphText: record.graphText,
        configSchema: { ...record.configSchema },
    }
}

export function cloneWorkflowValues(values: WorkflowFormValues): WorkflowFormValues {
    return {
        ...values,
        configSchema: { ...values.configSchema },
    }
}

type WorkflowFormOptions = {
    onInvalid: (issues: ZodIssue[]) => void
    onSubmit: (values: WorkflowFormValues) => Promise<void>
}

export function createWorkflowForm(
    initialValues: WorkflowFormValues = emptyWorkflowValues,
    options: WorkflowFormOptions,
) {
    return createForm(() => ({
        defaultValues: cloneWorkflowValues(initialValues),
        validators: {
            onSubmit: ({ value }) => {
                const result = workflowFormSchema.safeParse(value)

                return result.success ? undefined : result.error.issues
            },
        },
        onSubmitInvalid: ({ formApi }) => {
            const issues = formApi.state.errorMap.onSubmit

            if (issues) {
                options.onInvalid(issues)
            }
        },
        onSubmit: async ({ value }) => {
            await options.onSubmit(workflowFormSchema.parse(value))
        },
    }))
}

export type WorkflowForm = ReturnType<typeof createWorkflowForm>
