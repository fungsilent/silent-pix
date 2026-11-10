import { ApiError } from '#/api/api.client'
import { WorkflowMappingApiError } from '#/api/workflow'
import { toErrorMessage, toIssueMessage } from '#/lib/error'
import { t } from '#/lib/i18n'

import type { Comfy } from '@silent-pix/shared'
import type { ZodIssue } from '#/lib/error'
import type { AppIssue } from '#/lib/issue'
import type { GraphParse } from '#/pages/workflow/components/graph/graph.document'
import type { WorkflowFormValues } from '#/pages/workflow/form'

const fieldLabel: Record<keyof WorkflowFormValues, string> = {
    name: t('fields.name'),
    graphText: t('workflow.apiJson'),
    configSchema: t('workflow.mapping.title'),
}

export function toValidationIssues(issues: ZodIssue[]): AppIssue[] {
    return issues.map((issue, index) => {
        const key = issue.path[0]
        const isKnownField = typeof key === 'string' && key in fieldLabel

        return {
            id: `validation-${index}`,
            tone: 'error',
            field: isKnownField ? fieldLabel[key as keyof WorkflowFormValues] : undefined,
            message: toIssueMessage(issue),
        }
    })
}

const graphFailureMessage: Record<Comfy.ParseApiGraphFailure, string> = {
    'not-object': t('workflow.graph.notObject'),
    'ui-format': t('workflow.graph.uiFormat'),
    'invalid-node': t('workflow.graph.invalidNode'),
}

const mappingIssueMessage: Record<Comfy.MappingIssueReason, (issue: Comfy.MappingIssue) => string> = {
    'node-missing': issue => t('workflow.mapping.nodeMissing', { nodeId: issue.nodeId }),
    'input-missing': issue => t('workflow.mapping.inputMissing', { nodeId: issue.nodeId, input: issue.input }),
    'input-linked': issue => t('workflow.mapping.inputLinked', { nodeId: issue.nodeId, input: issue.input }),
}

export function toGraphIssues(parse: GraphParse): AppIssue[] {
    if (parse.status === 'invalid-json') {
        return [{
            id: 'graph-json',
            tone: 'error',
            field: t('workflow.apiJson'),
            message: parse.message,
        }]
    }

    if (parse.status === 'invalid-graph') {
        return [{
            id: `graph-${parse.reason}`,
            tone: 'error',
            field: t('workflow.apiJson'),
            message: graphFailureMessage[parse.reason],
        }]
    }

    return []
}

export function toMappingIssues(issues: Comfy.MappingIssue[]): AppIssue[] {
    return issues.map(issue => ({
        id: `mapping-${issue.field}`,
        tone: 'error',
        field: issue.field,
        message: mappingIssueMessage[issue.reason](issue),
    }))
}

export function toRequirementIssues(input: {
    isDirty: boolean
    name: string
    parse: GraphParse
}): AppIssue[] {
    if (!input.isDirty) {
        return []
    }

    const issues: AppIssue[] = []

    if (input.name.trim().length === 0) {
        issues.push({
            id: 'name-required',
            tone: 'error',
            field: t('fields.name'),
            message: t('workflow.nameRequired'),
        })
    }

    if (input.parse.status === 'empty') {
        issues.push({
            id: 'graph-empty',
            tone: 'error',
            field: t('workflow.apiJson'),
            message: t('workflow.graphRequired'),
        })
    }

    return issues
}

/* 清單掛掉整頁就沒東西可選，比 detail 掛掉更嚴重，所以一樣是 error */
export function toListIssues(input: {
    error: unknown
    onRetry: () => void
}): AppIssue[] {
    if (!input.error) {
        return []
    }

    return [{
        id: 'workflow-list-load',
        tone: 'error',
        field: t('workflow.title'),
        message: toErrorMessage(input.error),
        onRetry: input.onRetry,
    }]
}

export function toLoadIssues(error: unknown): AppIssue[] {
    if (!error) {
        return []
    }

    return [{
        id: 'workflow-load',
        tone: 'error',
        field: t('fields.workflow'),
        message: toErrorMessage(error),
    }]
}

export function toSaveIssues(input: {
    conflict: boolean
    error: unknown
}): AppIssue[] {
    if (input.conflict) {
        return [{
            id: 'save-conflict',
            tone: 'error',
            field: t('common.save'),
            message: t('workflow.saveConflict'),
        }]
    }

    if (!input.error) {
        return []
    }

    if (input.error instanceof ApiError && input.error.code === 'WORKFLOW_REVISION_CONFLICT') {
        return [{
            id: 'save-conflict',
            tone: 'error',
            field: t('common.save'),
            message: t('workflow.saveConflict'),
        }]
    }

    if (input.error instanceof WorkflowMappingApiError) {
        return toMappingIssues(input.error.issues)
    }

    return [{
        id: 'save-failed',
        tone: 'error',
        field: t('common.save'),
        message: toErrorMessage(input.error),
    }]
}
