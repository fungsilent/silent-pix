import { apiClient, ApiError, toApiError, unwrap } from '#/api/api.client'

import type { Comfy, WorkflowApi } from '@silent-pix/shared'

export class WorkflowMappingApiError extends ApiError {
    readonly issues: Comfy.MappingIssue[]

    constructor(status: number, message: string, issues: Comfy.MappingIssue[]) {
        super(status, 'WORKFLOW_MAPPING_INVALID', message)
        this.name = 'WorkflowMappingApiError'
        this.issues = issues
    }
}

type CreateWorkflowError = NonNullable<Awaited<ReturnType<typeof apiClient.api.workflow.post>>['error']>
type UpdateWorkflowError = NonNullable<Awaited<ReturnType<ReturnType<typeof apiClient.api.workflow>['put']>>['error']>

function mapWorkflowMutationError(error: CreateWorkflowError): ApiError
function mapWorkflowMutationError(error: UpdateWorkflowError): ApiError
function mapWorkflowMutationError(error: CreateWorkflowError | UpdateWorkflowError): ApiError {
    if (error.status === 422) {
        const value = error.value

        if (value.error.code === 'WORKFLOW_MAPPING_INVALID') {
            if (!('issues' in value)) {
                throw new Error('Workflow mapping error has an unexpected shape.')
            }

            return new WorkflowMappingApiError(error.status, value.error.message, value.issues)
        }
    }

    return toApiError(error)
}

export const workflowApi = {
    list(): Promise<WorkflowApi.GetWorkflowsResponse> {
        return unwrap(apiClient.api.workflow.get())
    },

    detail(request: WorkflowApi.GetWorkflowRequest): Promise<WorkflowApi.GetWorkflowResponse> {
        return unwrap(apiClient.api.workflow({ workflowId: request.workflowId }).get())
    },

    create(request: WorkflowApi.CreateWorkflowRequest): Promise<WorkflowApi.CreateWorkflowResponse> {
        return unwrap(apiClient.api.workflow.post(request, {}), mapWorkflowMutationError)
    },

    remove(request: WorkflowApi.GetWorkflowRequest): Promise<WorkflowApi.DeleteWorkflowResponse> {
        return unwrap(apiClient.api.workflow({ workflowId: request.workflowId }).delete(undefined, {}))
    },

    update(request: WorkflowApi.UpdateWorkflowParams & WorkflowApi.UpdateWorkflowRequest): Promise<WorkflowApi.UpdateWorkflowResponse> {
        return unwrap(apiClient.api.workflow({ workflowId: request.workflowId }).put({
            revision: request.revision,
            name: request.name,
            graph: request.graph,
            configSchema: request.configSchema,
        }, {}), mapWorkflowMutationError)
    },
}
