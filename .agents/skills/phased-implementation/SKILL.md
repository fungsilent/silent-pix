---
name: phased-implementation
description: Execute an approved implementation plan one PHASE at a time with Sol orchestration, bounded Luna implementation, repository validation, and an explicit user gate. Use for phased plan execution or when the user requests this sub-agent workflow; do not use for planning-only requests.
---

# Phased Implementation

Execute only the current approved PHASE. Read the plan and
`.agents/skills/plan-doc/SKILL.md` completely before changing code.

## Authority

| Actor | Authority |
|---|---|
| User | Owns requirements, scope changes, model and effort selection, reviewer initiation, manual testing, and PHASE confirmation |
| Sol orchestrator | Owns the plan, delegation, synthesis, architectural reassessment, and final technical assessment |
| Luna explorer | Read-only codebase discovery |
| Luna worker | Edits only the current PHASE scope and runs validation |
| Reviewer | Read-only review only when explicitly initiated by the user |

Automated checks and any user-requested review never substitute for user confirmation.

## Model selection

- The user decides every role's model and reasoning effort. Do not infer or substitute a preferred strength.
- The current user-selected setting for both Luna roles is `gpt-5.6-luna` with `xhigh` reasoning effort. Keep it until the user changes it.
- A reviewer has no default model or effort and must not be spawned unless the user explicitly requests the review and selects any configuration they require.

The running root session cannot silently retune itself. If its actual model or
effort differs from the user's selection, disclose that constraint; never claim
that it was changed. When spawning a role with an override, use a bounded history
fork or no history fork and provide a self-contained task.

## PHASE loop

```text
approved PHASE N
    -> Sol records the pre-PHASE workspace state and confirms the current contract
    -> Luna explorer gathers evidence when discovery is independently useful
    -> Luna worker implements only PHASE N
    -> worker runs full repository typecheck + build + lint
    -> Sol reassesses current architecture and every affected later PHASE
    -> Sol prepares the user handoff
    -> STOP for user code review and manual testing
       -> issue or scope change: remain in PHASE N
       -> `PHASE N confirmed`: revise the plan if needed; PHASE N+1 becomes eligible
```

Do not implement, scaffold, or make preparatory edits for the next PHASE. Do not
automatically spawn a reviewer, add review to the PHASE gate, or treat reviewer
approval as required. Only the user may initiate a review. If requested, the
reviewer works read-only; blocking findings remain in the current PHASE, Luna
fixes them, and repository validation repeats.

## Architecture standard

Sol must keep architectural reasoning active without designing for hypothetical needs. Optimize for the simplest architecture that cleanly fits the currently approved requirements and present system shape, not for the fewest files or smallest diff.

Before delegating and again before the PHASE handoff, assess whether the affected boundary still fits. Concrete signals include distinct workflows accumulating inside one owner, growing conditional or coordination code, unclear state ownership, repeated coupling between otherwise unrelated areas, or an abstraction that is now more complex than its current problem.

When a signal exists, compare a scoped local implementation with restructuring the affected boundary. Propose the refactor when it materially simplifies current responsibilities, even if the diff is larger. Do not introduce layers, extension points, generic infrastructure, unrelated cleanup, or preparation justified only by a possible future requirement or an unapproved later PHASE.

Explicit architecture and technology decisions in `AGENTS.md` remain binding. If the current requirement genuinely conflicts with one, identify the exact rule and concrete conflict, then stop for user review; no agent may silently override it.

Delegated roles use the same evidence standard: the explorer reports present structural signals, the worker implements the approved approach and surfaces newly discovered boundary conflicts instead of expanding scope, and a user-requested reviewer flags both unjustified architecture and local patches that preserve a demonstrably wrong boundary.

## Before delegation

1. Read the approved plan, its requirement sketch, and the current PHASE.
2. Recheck the current PHASE against the latest approved requirements and present code. If its architecture or boundary assumptions are already stale, update the plan and stop for user review before implementation.
3. Record `git status` and relevant existing diffs. The workspace is shared;
   preserve user changes and distinguish them from PHASE work.
4. Resolve the exact typecheck, build, and lint commands from repository scripts.
   This repository has no test script; do not search for, invent, or install one.
   Require concrete manual acceptance steps in the plan instead. If the plan does
   not name the applicable commands and manual steps, update it first.
5. Give each sub-agent a bounded prompt containing:
   - plan path and PHASE number;
   - outcome and acceptance criteria;
   - files or package boundaries it may touch;
   - required commands and evidence;
   - prohibited work and stop conditions.

Only Luna worker receives edit authority. Explorer and any user-requested
reviewer report findings with paths, symbols, and evidence; they do not patch
files.

## Validation gate

A PHASE is ready for user review only when all apply:

- Current PHASE scope and acceptance criteria are complete.
- Full repository typecheck succeeds.
- Full repository build succeeds.
- Full repository lint succeeds.
- Sol reports that this repository has no test script and provides the plan's
  concrete manual acceptance checklist; test-runner absence is not a failure.
- No knowingly broken lint, migration, or runtime contract remains.
- Sol reports changed files, commands and results, known limits, and concrete
  manual review steps.

If a PHASE cannot remain buildable by itself, redraw the boundary or combine
the interdependent work into the same PHASE. Never defer a known broken build
to a later PHASE.

## User feedback and plan changes

Any reported problem remains in the current PHASE. Reuse the Luna worker for
bounded fixes when practical, then rerun every required repository check. A prior
user-requested review does not authorize another reviewer pass; the user must
initiate each review.

When the user requests work outside the current plan:

1. Stop implementation and update the plan before more code changes.
2. If the request exposes an incorrect foundation, update the current and all
   affected downstream PHASEs and assumptions.
3. Reopen the earliest affected PHASE or add corrective work to the current
   PHASE; do not hide architectural correction in an unrelated later PHASE.
4. Continue the validation and user-review loop until the user is satisfied.

At every PHASE handoff, reassess later work against what now exists instead of treating the original plan as fixed. Report only structural concerns supported by current evidence. If requirements or findings invalidate later work, propose the exact PHASE changes and wait; the user may change, remove, split, merge, or replace those PHASEs.

Only an explicit, unambiguous user confirmation advances the gate. Accept the
exact `PHASE N confirmed` form documented in the plan; otherwise remain in the
current PHASE.

## Handoff

At the end of every PHASE, return:

```text
PHASE N handoff
- Changed files
- Automated validation commands and results
- No test script; manual acceptance checklist provided instead
- User-requested reviewer findings and resolutions, when applicable
- Current architecture fit and any proposed downstream plan changes
- Known limits
- User review and manual test checklist
- STOP -> waiting for `PHASE N confirmed`
```
