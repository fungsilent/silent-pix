---
name: phased-implementation
description: Execute an approved implementation plan one PHASE at a time with Sol orchestration, bounded Luna implementation, Terra review, repository validation, and an explicit user gate. Use for phased plan execution or when the user requests this sub-agent workflow; do not use for planning-only requests.
---

# Phased Implementation

Execute only the current approved PHASE. Read the plan and
`.agents/skills/plan-doc/SKILL.md` completely before changing code.

## Authority

| Actor | Authority |
|---|---|
| User | Owns requirements, scope changes, manual testing, and PHASE confirmation |
| Sol orchestrator | Owns the plan, delegation, synthesis, and final technical assessment |
| Luna explorer | Read-only codebase discovery |
| Luna worker | Edits only the current PHASE scope and runs validation |
| Terra critic | Read-only review and debugging findings |

Automated checks and agent review never substitute for user confirmation.

## Model routing

| Role | Model | Reasoning effort |
|---|---|---|
| Sol orchestrator | `gpt-5.6-sol` | User-selected; desired default is `medium` |
| Luna explorer | `gpt-5.6-luna` | `medium` |
| Luna worker | `gpt-5.6-luna` | `max` |
| Terra critic | `gpt-5.6-terra` | `high` |

The running root session cannot silently retune itself. If its actual model or
effort cannot satisfy the requested Sol configuration, disclose that constraint;
never claim that it was changed. When spawning a role with an override, use a
bounded history fork or no history fork and provide a self-contained task.

## PHASE loop

```text
approved PHASE N
    -> Sol records the pre-PHASE workspace state and freezes the contract
    -> Luna explorer gathers evidence when discovery is independently useful
    -> Luna worker implements only PHASE N
    -> worker runs available PHASE automation + full repository typecheck + full build
       -> repository has test scripts: run the current PHASE's relevant tests
       -> repository has no test script: record that fact; do not invent a test command
    -> Terra critic reviews the resulting diff without editing
       -> blocking findings: same PHASE, Luna fixes, all checks and review repeat
       -> no blocking findings: Sol prepares the user handoff
    -> STOP for user code review and manual testing
       -> issue or scope change: remain in PHASE N
       -> `PHASE N confirmed`: PHASE N+1 becomes eligible
```

Do not implement, scaffold, or make preparatory edits for the next PHASE. Do
not run Luna worker and Terra critic concurrently: review starts after the
implementation and validation handoff.

## Before delegation

1. Read the approved plan, its requirement sketch, and the current PHASE.
2. Record `git status` and relevant existing diffs. The workspace is shared;
   preserve user changes and distinguish them from PHASE work.
3. Resolve the exact typecheck, build, lint, and available PHASE-specific test
   commands from repository scripts. If the repository has no test script,
   record that evidence and require concrete manual acceptance steps in the
   plan instead of inventing or installing a test runner. If the plan does not
   name the applicable commands and manual steps, update it first.
4. Give each sub-agent a bounded prompt containing:
   - plan path and PHASE number;
   - outcome and acceptance criteria;
   - files or package boundaries it may touch;
   - required commands and evidence;
   - prohibited work and stop conditions.

Only Luna worker receives edit authority. Explorer and critic report findings
with paths, symbols, and evidence; they do not patch files.

## Validation gate

A PHASE is ready for user review only when all apply:

- Current PHASE scope and acceptance criteria are complete.
- Full repository typecheck succeeds.
- Full repository build succeeds.
- Repository lint succeeds when a lint script exists.
- PHASE-specific tests succeed when the repository provides applicable test
  scripts. If it provides none, Sol reports that limit and hands the user the
  plan's concrete manual acceptance checklist; absence of a test runner is not
  itself a blocking failure.
- No knowingly broken lint, migration, or runtime contract remains.
- Terra has no unresolved blocking finding.
- Sol reports changed files, commands and results, known limits, and concrete
  manual review steps.

If a PHASE cannot remain buildable by itself, redraw the boundary or combine
the interdependent work into the same PHASE. Never defer a known broken build
to a later PHASE.

## User feedback and plan changes

Any reported problem remains in the current PHASE. Reuse the Luna worker for
bounded fixes when practical, then rerun every required check and Terra review.

When the user requests work outside the current plan:

1. Stop implementation and update the plan before more code changes.
2. If the request exposes an incorrect foundation, update the current and all
   affected downstream PHASEs and assumptions.
3. Reopen the earliest affected PHASE or add corrective work to the current
   PHASE; do not hide architectural correction in an unrelated later PHASE.
4. Continue the validation and user-review loop until the user is satisfied.

Only an explicit, unambiguous user confirmation advances the gate. Accept the
exact `PHASE N confirmed` form documented in the plan; otherwise remain in the
current PHASE.

## Handoff

At the end of every PHASE, return:

```text
PHASE N handoff
- Changed files
- Automated validation commands and results
- Automated test availability (commands run, or evidence that no test script exists)
- Terra findings and resolutions
- Known limits
- User review and manual test checklist
- STOP -> waiting for `PHASE N confirmed`
```
