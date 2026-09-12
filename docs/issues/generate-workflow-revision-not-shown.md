# Generate page does not show the task Workflow revision

Status: Open

## Background

`GET /api/task/:taskId` already returns both `workflowRevision` and
`currentWorkflowRevision`. The Generate page receives these fields through its
task detail query, but `GenerateTaskDetail` does not project them into the
shared `TaskConfig`, so neither value is visible in the Generate detail panel.

## Trigger and impact

Create a task, then change the graph or mapping of its Workflow so the Workflow
revision advances. Selecting the old task on the Generate page shows the
Workflow name and generation config, but does not show which revision the task
recorded or that the current Workflow is newer.

The user therefore cannot distinguish these states from the UI:

- the task used the current Workflow revision;
- the task used an older Workflow revision;
- the legacy task has `workflowRevision = 0`, meaning its historical revision is unknown.

## Decision

Deferred during Phase 3 while the presentation is being considered. This issue
records only the missing Generate-page information; placement, badge treatment,
draft behavior, and whether Compare should share the presentation are not yet
settled.

## Acceptance checks

- A saved task on the Generate page exposes its recorded Workflow revision.
- When `workflowRevision !== currentWorkflowRevision`, the UI makes both values distinguishable.
- Legacy `workflowRevision = 0` is presented as unknown, not as a real revision.
- Loading and draft states do not display fabricated revision history.
- No additional request is made when the existing task detail payload already contains both values.
- Typecheck, build, lint, and `git diff --check` pass when the issue is implemented.
