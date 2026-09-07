# Selected task delete can outlive the client timeout

Status: Open

## Background

`apiClient` uses a default `AbortSignal.timeout(10_000)`. `removeDiscarded` already overrides this with a 60-second signal, but selected `removeMany` currently does not.

## Trigger and impact

A selected batch can contain up to 200 tasks, and each task may reference multiple images. The server commits task deletion before running `deleteUnreferenced`. If cleanup exceeds 10 seconds, the client can time out after the server has already deleted the tasks. The mutation `onSuccess` and cache cleanup then do not run, and retrying may return `404` (`TASK_NOT_FOUND`).

## Decision

Deferred from Phase 6. This is not fixed in the current implementation.

## Minimal fix

- Change `taskApi.removeMany(request, signal?)` to follow the existing optional-signal pattern.
- Pass `AbortSignal.timeout(60_000)` from `useDeleteSelectedTasksMutation`.
- Do not change the server, REST contract, or cache behavior.

## Acceptance checks

- Selected delete passes a 60-second abort signal to the API client.
- The default 10-second timeout is not used for selected batch delete.
- A successful selected delete still runs the existing `onSuccess` cache cleanup.
- Server routes, REST contracts, and cache logic remain unchanged.
- Typecheck, build, lint, and `git diff --check` pass.
