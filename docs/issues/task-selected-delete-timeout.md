# Selected task delete can outlive the client timeout

Status: Open

## Background

`apiClient` uses a default `AbortSignal.timeout(10_000)`. `removeDiscarded` already overrides this with a 60-second signal, but selected `removeMany` currently does not.

## Trigger and impact

A selected batch can contain up to 200 tasks, and each task may reference multiple images. The server commits task deletion before running `deleteUnreferenced`. If cleanup exceeds 10 seconds, the client can time out after the server has already deleted the tasks. The mutation `onSuccess` and cache cleanup then do not run, and retrying may return `404` (`TASK_NOT_FOUND`).

## Decision

Deferred from Phase 6. This is not fixed in the current implementation.

## Minimal mitigation

- Change `taskApi.removeMany(request, signal?)` to follow the existing optional-signal pattern.
- Pass `AbortSignal.timeout(60_000)` from `useDeleteSelectedTasksMutation`.
- This bounded mitigation changes only the client timeout; it does not resolve server commit/response ambiguity.

A request can still exceed 60 seconds or lose its response after commit. Client
abort does not prove the server rolled back. `task.removed` may reconcile caches
if it is delivered, but the mutation `onSuccess` will not run after timeout.
A complete outcome-recovery design remains open; extending the timeout does
not establish all-or-none semantics across SQLite and filesystem cleanup.

## Acceptance checks

- Selected delete passes a 60-second abort signal to the API client.
- The default 10-second timeout is not used for selected batch delete.
- A successful selected delete still runs the existing `onSuccess` cache cleanup.
- Server routes, REST contracts, and cache logic remain unchanged.
- Typecheck, build, lint, and `git diff --check` pass when implementing the mitigation.
- A timeout after server commit remains documented as an unresolved outcome; do not mark the entire issue fixed solely because the timeout increased.
