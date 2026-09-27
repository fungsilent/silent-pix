---
name: reuse-focused-code-review
description: Review existing code for fake reuse, low-value abstractions, fragmented ownership, redundant wrappers/options/conversions, dead exports, and duplicate truth sources while preserving real safety and atomicity. Use when the user asks which code is meaningless, unnecessary, over-abstracted, or unhealthy from a reuse perspective; do not use for ordinary bug-only reviews.
---

# Reuse-Focused Code Review

Find code whose abstraction cost exceeds its demonstrated value, including responsibility splits that force callers to coordinate internal details. Apply the same criteria across frontend, backend, and infrastructure code. Treat reuse as evidence from current callers and invariants, not as a reason to create generic layers.

## Evidence pass

Before judging a symbol or layer:

1. Read the applicable `AGENTS.md` and the complete owning module.
2. Use `rg` to enumerate every definition, import, caller, option value, and duplicated literal.
3. Trace the full operation, including DB transaction, filesystem, network, error, and lifecycle boundaries.
4. Check whether apparently repeated work is required at different trust or commit boundaries.
5. For stateful operations, trace who creates, reads, changes, commits, resets, and releases the state or resource. Identify coordination across modules and why each boundary exists.

Use these classifications:

| Classification | Evidence |
|---|---|
| Dead surface | Export/type/helper has no consumer and adds no distinct domain shape |
| Thin duplicate layer | Wrapper only forwards, projects `.length`, or repeats the same chunk/dedup work |
| Fake generality | Collection/options API has one caller that always supplies one fixed shape |
| Redundant option | Every production caller passes the same canonical value already available to the owner |
| Wasteful conversion | Full copy/parse/validation occurs without crossing a trust or ownership boundary |
| Fragmented ownership | A capability is split so callers manage internal state, sequencing, or cleanup without a distinct responsibility requiring that split |
| Duplicate truth source | The same domain values or rules are maintained independently in multiple packages |
| Real reusable capability | Multiple workflows share one semantic operation or safety invariant |
| Necessary repetition | Recheck is required at mutation time, transaction commit, external boundary, or recovery path |

## Decision rules

- Prefer one complete reusable capability over public “rows-only” plus “rows-and-side-effect” variants when a structured item result can serve every caller.
- Do not turn a service into a repository façade merely to hide direct SQL. A cohesive domain operation may own its specialized query.
- Do not broaden an exact finder into an option-driven query builder to manufacture reuse.
- Keep one-caller application operations when they isolate Route/transport concerns or own real business semantics.
- Extract a helper when multiple current callers share the same semantic predicate or invariant; do not extract unrelated single-use functions into a generic `util` file.
- Prefer canonical configuration over a second runtime override when all supported environments already load the same configured value.
- Preserve guards that close a race: lookup-time validation does not replace mutation-time predicates.
- Preserve transaction, batch, lock, commit-before-unlink, cleanup, and event ordering unless the user explicitly asks to change behavior.
- State behavior changes separately from structural cleanup, especially error continuation versus throw semantics.

## Responsibility and lifecycle boundaries

- Check whether an extracted module owns a coherent capability or only moves code while leaving its internal protocol with callers. For example, a dialog may own temporary selection until Apply, a service may own an atomic business operation, and a connection owner may pair listener registration with cleanup.
- Keep coordination with the owner that needs it. External control, shared state, distinct lifetimes, transport adapters, and transaction boundaries can justify a split; do not centralize everything merely because it participates in one operation.
- Ground a proposed regrouping in a concrete maintenance scenario from current behavior: which internal details would a caller stop knowing, or which coordinated edits would disappear? Moving files, shortening functions, or reducing prop/parameter counts alone is not a benefit.
- Compare that benefit with added interfaces, duplicated layout or logic, lifecycle coupling, and behavior changes. Prefer keeping the current structure when the proposal leaves the identified problem unresolved or merely moves complexity elsewhere.

## False positives to reject

Do not label code meaningless merely because it is duplicated, has one caller, is long, or takes many props/parameters. A local component or helper can isolate real complexity; a narrow consumer contract is not a duplicate merely because its fields overlap a transport type. Verify whether it provides one of these:

```text
external validation
transaction-time guard
database uniqueness fallback
filesystem recovery
typed transport projection
shutdown admission/drain
platform path conversion
different caller error policy
```

When a supported deployment invariant makes a defensive branch nearly unreachable, report it as conditional rather than dead unless the invariant structurally prevents the branch.

## Deliverable

Lead with findings ordered by confidence and impact. For each finding include:

| Field | Required content |
|---|---|
| Evidence | Clickable file/line and complete caller count |
| Why low-value | The exact forwarding, fixed option, unused surface, duplicate work, copy, or unnecessary caller coordination |
| Recommendation | Remove, inline, combine, localize, regroup responsibility, or centralize the real invariant |
| Concrete benefit | The problem resolved; for a responsibility change, a current maintenance scenario and the knowledge or coordinated edits eliminated |
| Tradeoff | Added interfaces, duplication, or coupling; why the proposal is preferable to retaining the current structure, or why it should be rejected |
| Boundary check | What safety, atomicity, contract, or behavior must remain |

Separate the report into:

1. Clearly removable/combinable code or responsibility changes with demonstrated benefit.
2. Conditional simplifications requiring a behavior decision.
3. Apparent duplication that must remain.

State the review coverage: distinguish modules read and operations traced from reference-only scans, and identify unexamined areas or unverified behavior. “No further findings in the reviewed scope” does not establish that the entire codebase needs no refactoring.

Do not edit code during a review-only request. If the user asks for an implementation plan, use the repository's `plan-doc` skill and convert findings into independently coherent PHASEs with explicit user gates.
