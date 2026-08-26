import type { Comfy } from '@silent-pix/shared'
import type { AppIssue } from '#/lib/issue'
import type { GraphParse } from '#/pages/workflow/components/graph/graph.document'

const graphFailureMessage: Record<Comfy.ParseApiGraphFailure, string> = {
    'not-object': 'The pasted JSON is not a ComfyUI graph object.',
    'ui-format': 'That is the UI workflow format. In ComfyUI use Workflow → Export (API).',
    'invalid-node': 'Some nodes are missing class_type or inputs, so this is not an API graph.',
}

const mappingIssueMessage: Record<Comfy.MappingIssueReason, (issue: Comfy.MappingIssue) => string> = {
    'node-missing': issue => `Node ${issue.nodeId} is not in the pasted graph.`,
    'input-missing': issue => `Node ${issue.nodeId} has no input named ${issue.input}.`,
    'input-linked': issue => `${issue.nodeId}.${issue.input} is wired from another node, so it cannot be written.`,
}

export function toGraphIssues(parse: GraphParse): AppIssue[] {
    if (parse.status === 'invalid-json') {
        return [{
            id: 'graph-json',
            tone: 'error',
            field: 'API JSON',
            message: parse.message,
        }]
    }

    if (parse.status === 'invalid-graph') {
        return [{
            id: `graph-${parse.reason}`,
            tone: 'error',
            field: 'API JSON',
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
