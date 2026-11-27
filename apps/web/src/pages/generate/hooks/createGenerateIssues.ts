import { createEffect, createMemo, on } from 'solid-js'

import { useLoraListQuery, useSamplerListQuery, useTaskFeedQuery } from '#/data/task/task.query'
import { useWorkflowListQuery } from '#/data/workflow/workflow.query'
import { toErrorMessage } from '#/lib/error'
import { t } from '#/lib/i18n'
import { generateFieldLabel } from '#/pages/generate/issue'
import { useGenerateSession } from '#/pages/generate/state/session'
import { hasLostConnection, serviceHealth } from '#/store/app'
import { createIssueSource, issueList } from '#/store/issue'

import type { GenerateIssue } from '#/pages/generate/issue'
import type { Accessor } from 'solid-js'

export function createGenerateIssues() {
    const generateSession = useGenerateSession()
    const runtimeIssues = createRuntimeIssues()
    const issues = () => [...runtimeIssues(), ...generateSession.state.submitIssues]
    createIssueSource(issues)

    createEffect(on(
        () => generateSession.state.submitToken,
        token => {
            if (token > 0 && issues().length > 0) {
                issueList.setOpen(true)
            }
        },
        { defer: true },
    ))
}

function createRuntimeIssues(): Accessor<GenerateIssue[]> {
    const generateSession = useGenerateSession()
    const workflowId = generateSession.form.useSelector(({ values }) => values.workflowId)
    const workflowQuery = useWorkflowListQuery()
    const samplerQuery = useSamplerListQuery()
    const taskFeedQuery = useTaskFeedQuery(generateSession.feedFilter)
    const loraQuery = useLoraListQuery(() => false)

    const isSelectedWorkflowUnusable = () => {
        const current = workflowId()

        if (!current) {
            return false
        }

        const selected = workflowQuery.data?.options.find(workflow => workflow.id === current)

        return !selected || selected.archivedAt !== null
    }

    return createMemo(() => {
        const issues: GenerateIssue[] = []

        if (hasLostConnection()) {
            const lost: GenerateIssue = {
                id: 'server-connection',
                tone: 'error',
                message: () => t('generate.lostConnection'),
            }

            return [lost]
        }

        const health = serviceHealth()
        const comfyDown = health?.comfy === false

        if (comfyDown) {
            issues.push({
                id: 'comfy-down',
                tone: 'error',
                field: () => 'ComfyUI',
                message: () => t('generate.comfyUnavailable'),
            })
        }

        if (workflowQuery.isError) {
            issues.push({
                id: 'workflow-load',
                tone: 'error',
                field: generateFieldLabel.workflowId,
                message: () => toErrorMessage(workflowQuery.error),
                onRetry: () => { void workflowQuery.refetch() },
            })
        }
        else if (workflowQuery.isSuccess && workflowQuery.data.options.length === 0) {
            issues.push({
                id: 'workflow-empty',
                tone: 'error',
                field: generateFieldLabel.workflowId,
                message: () => t('generate.noWorkflows'),
                onRetry: () => { void workflowQuery.refetch() },
            })
        }
        else if (workflowQuery.isSuccess && isSelectedWorkflowUnusable()) {
            issues.push({
                id: 'workflow-unusable',
                tone: 'error',
                field: generateFieldLabel.workflowId,
                message: () => t('generate.workflowArchived'),
            })
        }

        if (!comfyDown && samplerQuery.isError) {
            issues.push({
                id: 'sampler-load',
                tone: 'warning',
                field: generateFieldLabel.sampler,
                message: () => toErrorMessage(samplerQuery.error),
                onRetry: () => { void samplerQuery.refetch() },
            })
        }

        if (!comfyDown && loraQuery.isError) {
            issues.push({
                id: 'lora-load',
                tone: 'warning',
                field: generateFieldLabel.lora,
                message: () => toErrorMessage(loraQuery.error),
                onRetry: () => { void loraQuery.refetch() },
            })
        }

        if (taskFeedQuery.isError) {
            issues.push({
                id: 'task-load',
                tone: 'warning',
                field: () => t('task.title'),
                message: () => toErrorMessage(taskFeedQuery.error),
                onRetry: () => { void taskFeedQuery.refetch() },
            })
        }

        return mergeByMessage(issues)
    })
}

function mergeByMessage(issues: GenerateIssue[]): GenerateIssue[] {
    const merged = new Map<string, GenerateIssue>()

    for (const issue of issues) {
        const message = issue.message()
        const existing = merged.get(message)

        if (!existing) {
            merged.set(message, issue)
            continue
        }

        const retries = [existing.onRetry, issue.onRetry].filter(retry => retry !== undefined)

        merged.set(message, {
            ...existing,
            tone: existing.tone === 'error' || issue.tone === 'error' ? 'error' : 'warning',
            field: () => [existing.field?.(), issue.field?.()].filter(field => field !== undefined).join(', '),
            onRetry: retries.length > 0
                ? () => retries.forEach(retry => retry())
                : undefined,
        })
    }

    return [...merged.values()]
}
