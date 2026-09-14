---
name: reuse-focused-code-review
description: Review existing code for fake reuse, low-value abstractions, redundant wrappers/options/conversions, dead exports, and duplicate truth sources while preserving real safety and atomicity. Use when the user asks which code is meaningless, unnecessary, over-abstracted, or unhealthy from a reuse perspective; do not use for ordinary bug-only reviews.
---

# Reuse-Focused Code Review

Find code whose abstraction cost exceeds its demonstrated value. Treat reuse as evidence from current callers and invariants, not as a reason to create generic layers.

## Evidence pass

Before judging a symbol or layer:

1. Read the applicable `AGENTS.md` and the complete owning module.
2. Use `rg` to enumerate every definition, import, caller, option value, and duplicated literal.
3. Trace the full operation, including DB transaction, filesystem, network, error, and lifecycle boundaries.
4. Check whether apparently repeated work is required at different trust or commit boundaries.

Use these classifications:

| Classification | Evidence |
|---|---|
| Dead surface | Export/type/helper has no consumer and adds no distinct domain shape |
| Thin duplicate layer | Wrapper only forwards, projects `.length`, or repeats the same chunk/dedup work |
| Fake generality | Collection/options API has one caller that always supplies one fixed shape |
| Redundant option | Every production caller passes the same canonical value already available to the owner |
| Wasteful conversion | Full copy/parse/validation occurs without crossing a trust or ownership boundary |
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

## False positives to reject

Do not label code meaningless merely because it is duplicated or has one caller. Verify whether it provides one of these:

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
| Why low-value | The exact forwarding, fixed option, unused surface, duplicate work, or copy |
| Recommendation | Remove, inline, combine, localize, or centralize the real invariant |
| Boundary check | What safety, atomicity, contract, or behavior must remain |

Separate the report into:

1. Clearly removable/combinable code.
2. Conditional simplifications requiring a behavior decision.
3. Apparent duplication that must remain.

Do not edit code during a review-only request. If the user asks for an implementation plan, use the repository's `plan-doc` skill and convert findings into independently coherent PHASEs with explicit user gates.
