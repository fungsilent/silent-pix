---
name: architecture-refactoring-review
description: Review architecture and refactoring opportunities through responsibility boundaries, cohesion, coupling, dependency direction, state ownership, abstraction cost, naming, and reuse. Trace complete operations and propose coherent target structures grounded in current requirements. Use for architecture restructuring, deep maintainability reviews, and simplification refactors; do not use for ordinary bug-only reviews.
---

# Architecture and Refactoring Review

Evaluate how the architecture supports current behavior and changes across frontend, backend, and infrastructure code. Review responsibility boundaries, dependencies, state, abstractions, naming, and reuse as complementary dimensions. A design can need restructuring with no duplication or reusable helper to extract. Treat reuse as evidence from current callers and invariants, not as the review's organizing goal or a reason to create generic layers.

## Review objective and scope

- Optimize the resulting operation's clarity and maintenance cost. A small diff is a tie-breaker between equally effective solutions, not a reason to retain a harmful structure or stop at a cosmetic fix.
- Start from the requested area, then follow its callers, state owners, and side effects to the root cause, including unchanged code. Let the semantic operation define the necessary scope; do not restrict a deep review to recent hunks or expand it into unrelated cleanup.
- Evaluate the current structure as a candidate, not a requirement. Recommend a broader regrouping when evidence shows it resolves the problem better; keep explicit project boundaries and contracts binding. If a recommendation conflicts with them, identify the conflict for user review rather than silently crossing it.
- Prefer the simplest complete design for current requirements. Do not add speculative flexibility or redesign working code merely to match a preferred style.
- Judge architecture against its actual deployment, workflows, and ownership constraints. More layers, generic interfaces, dependency injection, or a named architecture pattern are not improvements without a demonstrated problem they resolve.

## Evidence pass

Before judging the structure:

1. Read the applicable `AGENTS.md`, project conventions, and complete owning modules. Establish expected behavior before evaluating their structure; consult history when the reason for a boundary remains unclear.
2. Use `rg` to enumerate definitions, imports, callers, option values, and duplicated rules. Include tests, fixtures, config, registration, and dynamic references before declaring a surface unused. Distinguish production callers from other consumers and state unresolved references.
3. Map the relevant responsibilities and dependency direction, then trace the full operation from entry to outcome, including DB transaction, filesystem, network, error, and lifecycle boundaries. Follow data shapes through wrappers and conversions; check what each layer actually adds. Include runtime callbacks, events, and initialization dependencies, not only imports.
4. Check whether apparently repeated work is required at different trust or commit boundaries.
5. For stateful operations, trace who creates, reads, changes, commits, resets, and releases the state or resource. Identify coordination across modules and why each boundary exists.
6. Choose a concrete maintenance scenario from current behavior, such as changing a rule or adding an already-supported input variant. Identify which concepts, call sites, and files must change together and why. Compare that burden with the proposed structure.

## Architecture review dimensions

Examine the relevant dimensions before choosing a refactor. Do not reduce the review to searching for wrappers or repeated code.

| Dimension | Evidence to examine |
|---|---|
| Responsibility and boundaries | Who owns each rule and operation; transport, UI, domain, or storage details leaking into an owner that should not coordinate them |
| Cohesion and coupling | Related decisions scattered across modules; unrelated jobs forced together; changes requiring knowledge or coordinated edits outside their proper owner |
| Dependency direction | Cycles, reverse dependencies, implementation details exposed through contracts, or initialization order that defeats the intended package/layer boundaries |
| State and lifecycle | Competing truth sources, unclear mutation authority, copied derived state, or acquisition, commit, reset, and cleanup split across owners |
| Abstraction cost | Concepts, call hops, public surface, fixed options, redundant conversions, and internal protocols callers must learn compared with the capability or invariant actually hidden |
| Naming and domain model | Names and types that obscure responsibility, side effects, scope, or domain distinctions; mismatched concepts forcing callers to translate or inspect internals |
| Reuse and repetition | Shared semantic invariants maintained independently, fake generality, forwarding wrappers, redundant options, dead exports, or superficial similarities that should remain separate |
| Control and data flow | Branching, indirect dispatch, intermediate shapes, and side-effect order that make outcomes difficult to trace |

Count repeated knowledge and coupled edits, not just lines or files. For example, a single-use module may protect a valuable transport boundary, while a widely reused helper may impose the wrong domain model on all its callers. Caller count is evidence, not a quality score.

## Naming and local clarity

- Name domain concepts and operations at their actual level of responsibility. A function that persists, publishes, or deletes must not imply a pure lookup; distinguish similar operations by their real semantics rather than vague suffixes.
- Report naming problems with a specific misunderstanding at a caller and a concrete replacement. Do not rename for taste, expand every abbreviation, or encode details that callers should not need to know.
- Use guard clauses, direct conditions, named intermediate values, or simpler platform operations when they expose the flow more clearly. Avoid dense one-liners, nested ternaries, or helper extraction that merely moves the reading burden elsewhere.
- Before calling a rewrite equivalent, check evaluation order, short-circuiting, null/empty distinctions, mutation, exception and Promise behavior, and observable ordering where relevant. Shorter syntax alone is not evidence of simplification.
- Do not use line-count, nesting-depth, parameter-count, or duplication-length thresholds as automatic reasons to extract or split. Identify the distinct responsibility or concrete comprehension problem.

## Refactoring decisions and invariants

- Choose the target owner and dependency direction before designing helpers. Prefer a complete capability over partial variants that force callers to coordinate internal steps; do not merge distinct policies merely to expose one entry point.
- Do not turn a service into a repository façade merely to hide direct SQL. A cohesive domain operation may own its specialized query.
- Do not broaden an exact finder into an option-driven query builder to manufacture reuse.
- Keep one-caller application operations when they isolate Route/transport concerns or own real business semantics.
- Extract shared logic when current callers share the same semantic predicate or invariant and centralizing it reduces repeated knowledge. Keep small intentional duplication when extraction would couple unrelated concepts; do not collect unrelated single-use functions in a generic `util` file.
- Prefer canonical configuration over a second runtime override when all supported environments already load the same configured value.
- Preserve guards that close a race: lookup-time validation does not replace mutation-time predicates.
- Preserve transaction, batch, lock, commit-before-unlink, cleanup, and event ordering unless the user explicitly asks to change behavior.
- State behavior changes separately from structural cleanup, especially error continuation versus throw semantics.

## Responsibility and lifecycle boundaries

- Check whether an extracted module owns a coherent capability or only moves code while leaving its internal protocol with callers. For example, a dialog may own temporary selection until Apply, a service may own an atomic business operation, and a connection owner may pair listener registration with cleanup.
- Bring related decisions, state transitions, and cleanup under the owner that can enforce the whole invariant. Merge helpers or modules when their separation exposes internal sequencing or forces coordinated edits; split unrelated responsibilities when keeping them together creates that burden. Similar syntax alone does not establish cohesion.
- Keep coordination with the owner that needs it. External control, shared state, distinct lifetimes, transport adapters, and transaction boundaries can justify a split; do not centralize everything merely because it participates in one operation.
- Ground a proposed regrouping in a concrete maintenance scenario from current behavior: which internal details would a caller stop knowing, or which coordinated edits would disappear? Moving files, shortening functions, or reducing prop/parameter counts alone is not a benefit.
- Compare that benefit with added interfaces, duplicated layout or logic, lifecycle coupling, and behavior changes. Reject proposals that merely move complexity elsewhere. If a local patch leaves the demonstrated root cause intact, describe the cohesive refactor needed instead of treating the smaller patch as the solution.

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

Preserve the capability or guarantee, not necessarily its current wrapper or file layout. An important guard can move with its operation when its timing and scope remain intact; its presence does not justify every surrounding abstraction.

When a supported deployment invariant makes a defensive branch nearly unreachable, report it as conditional rather than dead unless the invariant structurally prevents the branch.

## Deliverable

Briefly establish the reviewed operation's current owners and dependency flow, using a compact table or diagram when it makes a boundary issue clearer. Then present findings ordered by impact, then confidence. Group symptoms under their root cause so reuse, naming, or syntax findings do not bury an architectural problem. For each finding include:

| Field | Required content |
|---|---|
| Evidence | Clickable file/line, actual consumers and caller count where applicable, and any unresolved references |
| Cost or confusion | The specific boundary, dependency, state, abstraction, naming, reuse, or flow problem and its concrete consequence |
| Recommendation and reach | Concrete target owners, boundaries, and dependency/data flow, or replacement name/flow for a local finding; affected callers, exports, tests, fixtures, and config as applicable |
| Concrete benefit | A current misunderstanding or maintenance scenario and the knowledge, reading steps, or coordinated edits eliminated |
| Tradeoff | Resulting complexity, interfaces, duplication, coupling, and migration burden compared with retaining the current structure or applying a local patch |
| Boundary check | What safety, atomicity, contract, or behavior must remain, and what existing check or concrete acceptance case would verify it |

Separate the report into:

1. Behavior-preserving architecture and code improvements with demonstrated benefit, including cohesive refactors that span multiple files.
2. Conditional restructuring requiring a behavior or project-boundary decision.
3. Existing boundaries, abstractions, or repetition that have a concrete reason to remain.

State the review coverage: distinguish modules read and operations traced from reference-only scans, and identify unexamined areas or unverified behavior. “No further findings in the reviewed scope” does not establish that the entire codebase needs no refactoring.

Do not edit code during a review-only request. When implementation is requested, complete each selected refactor across its affected consumers, preserve behavior and error handling, and use the project's existing validation commands or focused acceptance checks. Do not invent a test framework or weaken assertions to make a refactor pass. If the user asks for an implementation plan, follow the repository's plan-document and PHASE rules.
