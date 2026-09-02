---
name: plan-doc
description: Write an implementation plan document for this repo — where it goes, what sections it has, and how dense the prose is allowed to be. Use when asked to plan a feature, produce a plan or design doc, or when exploration is finished and an implementation is about to be proposed. Read before writing the first line of the plan, not after.
---

# Plan Document

## Location and language

- Path: `temp/<feature>-<author>-plan.md`. `temp/` is gitignored — plans are working documents, not repo history.
- The user's requirement sketch usually already sits at `temp/<feature>-plan.md`. Read it. Never overwrite it.
- Write in Traditional Chinese. Keep proper nouns, identifiers, paths, commands, and code in English.

## The rule everything else follows

**Show, don't argue.** A plan is scanned, not read. Every section earns its place with a table, a code sketch, an ASCII layout, or a numbered list; prose is the connective tissue between those, never the payload.

- One line of "why" per decision, and only when the reason stops someone making a mistake.
- Delete the alternatives you rejected. A plan is the recommendation, not the deliberation. "We considered X but chose Y because…" is three sentences that become zero.
- If a paragraph can be a table row, make it a table row.
- Rationale that must survive goes in a **code comment inside the sketch**, where it will be read at the moment it matters.
- Blockquote (`>`) is reserved for "ignore this and it breaks". Never for emphasis.
- Bold is for the load-bearing clause of a sentence, not for whole sentences.

Rough calibration: a feature touching ~20 files lands around 400 lines, of which more than half is code, tables, and diagrams.

## Architecture target

Plan for **the simplest architecture that cleanly fits current requirements and current system shape**. This is not a smallest-diff or MVP-first rule.

```text
current requirement
    -> existing boundary still fits -> implement locally
    -> concrete boundary problem now exists -> propose the scoped refactor
    -> only hypothetical future benefit -> omit the architecture
```

- Tie a new abstraction or refactor to evidence in the current requirements and code. Generic appeals to best practice, scalability, extensibility, reusability, or separation of concerns are not evidence by themselves.
- Treat distinct workflows, accumulating conditionals or glue, unclear state ownership, and repeated unrelated edits as signals to compare a local change with restructuring the affected boundary.
- A larger refactor is valid when it materially clarifies current responsibilities. Keep it scoped to that problem; do not fold in unrelated cleanup or prepare infrastructure merely because a later PHASE is planned.
- Preserve explicit decisions in `AGENTS.md`. If a requirement conflicts with one, document the conflict under `## 你要做的事` and stop for the user's decision instead of planning around the rule.

## Phased delivery and review gates

Every implementation plan must be split into meaningful, independently reviewable **PHASEs**. A trivial change may have one PHASE; do not invent ceremony where there is no meaningful boundary or split tightly coupled work merely to reduce each diff.

Each PHASE must leave the workspace in a coherent, testable state and include all four items:

| Item | Required content |
|---|---|
| Scope | Exact files/boundaries changed in this PHASE |
| Automated validation | Typecheck/build/lint and any test commands the repository actually provides |
| User review | Observable manual checks the user can perform now |
| Gate | `STOP → wait for PHASE N confirmed` |

Use this execution contract:

```text
PHASE N implementation
    ↓
agent runs repository checks + available phase-scoped tests
    └─ no repository test script → report the absence; do not invent one
    ↓
agent reports changed files, results, known limits, and user review steps
    + reassesses later PHASEs against current requirements and system shape
    ↓
STOP
    ├─ user reports issue  → remain in PHASE N and fix it
    └─ user confirms       → revise affected later PHASEs, then PHASE N+1 may begin
```

> Never implement, scaffold, or make preparatory edits for PHASE N+1 before the user explicitly confirms PHASE N.

- A failing review stays in the current PHASE until corrected and confirmed.
- A requested scope change or newly exposed structural problem updates affected later PHASEs before work continues. Later PHASEs may be changed, removed, split, merged, or replaced.
- A PHASE boundary must not knowingly leave typecheck, lint, build, migrations, or runtime contracts broken; name any check that is intentionally deferred and the PHASE that owns it.
- When the repository has no test script, state that in automated validation
  and make the user-review checklist cover the PHASE's observable behavior.
  Do not add a test runner solely to satisfy plan ceremony.
- Put headless contracts/engines before UI integration when this gives the user a meaningful test boundary.
- Put destructive actions in their own PHASE with backup and recovery commands.
- Do not equate an agent's automated tests with user confirmation.

## Sections

Use these in this order. Drop any that would be empty; do not invent extras.

### `## Context`

Two or three bullets naming what in the **current code** blocks the request — with the file and the symbol, not a vague complaint. Include concrete evidence when an existing boundary no longer fits; do not invent future pressure. Then one sentence of goal. No background the user already gave you.

```markdown
- **圖片沒有身分** — `task_images` 只有 `(id, taskId, path, filename)`，API 回傳純 URL 字串。前端無法指名「拿這張當輸入」。
```

### `## 已定案`

A two-column table of decisions already settled with the user. This exists so nobody reopens them mid-implementation. If a decision was made in conversation and is not in this table, it will be relitigated.

### Layered body sections

One per boundary the change crosses — typically 資料模型 / 後端 / Contract / 前端. Inside each:

- **Schema and contract changes as literal code**, not description. A diff-shaped block beats a sentence:

  ```ts
  taskConfig.denoise            = z.number().min(0.05).max(1).default(1)
  getTaskResponse.images        = z.array(imageResource)     // 從 z.array(z.string())
  createTaskRequest.initImageId = z.uuid().nullable().default(null)   // 新增，top-level
  ```

- **UI changes as an ASCII layout**, showing the states side by side (empty / filled / pending / how it grows later). This is the highest value-per-line element in the whole document — a paragraph describing a panel is worthless next to a 12-line box drawing.
- **Flows as a small tree or arrow block**, not numbered prose:

  ```
  hash → 查 images.hash
    ├ 命中 → access() 確認檔案在 → 回既有 row，200
    └ 未命中 → sniff → 寫檔 → onConflictDoNothing → 201
  ```

- Mechanical mappings (error codes, node ids, per-mode control behaviour) as tables.

### `## 你要做的事`

Everything the plan cannot execute: work outside the repo, external tools, and decisions still owed. State each as an action, and say exactly what you need back. Do not bury these in the body.

For phased plans, include the exact confirmation expected after every user review, such as `PHASE 2 confirmed`, and state that reported problems remain in that PHASE.

### `## 執行順序`

Organize execution under `### PHASE N — Outcome` headings. Within each PHASE, use a numbered list inside a fenced block, one line per step, naming files not prose. Mark steps that **must land in the same commit** and steps that are **spikes before committing to a contract**.

```
4.  packages/shared  api/image.ts、api/task.ts、event/task.ts     ← 與 7 同一個 commit
5.  apps/server      lib/image/{hash,meta,store}.ts（+ image-size）
```

Anything destructive (reset, migration, deleting data) gets its own paragraph here with the backup command spelled out.

End every PHASE with its automated validation, user review checklist, and explicit STOP gate. Do not place all review work only in the final PHASE.

### `## 驗證`

A numbered checklist, each item a command or an observable outcome. "測試上傳" is useless; "同檔再送一次 → 200 且 `id` 相同，`storage/images/` 只有一個檔案" is a test.

### `## 風險`

A table: `# | 風險 | 處置`. Every unverified assumption goes here, including the ones you introduced. If a risk was disproved during planning, say so in the 處置 column rather than deleting the row — the reader may have the same worry.

## Before handing it over

- Every claim about existing code cites a real path, and you actually read that file.
- Nothing appears in both the body and 風險 as new information.
- No section is pure prose.
- Decisions the user made in conversation are all in 已定案.
- 你要做的事 is repeated in the chat reply — that is the part they act on today.
- Every PHASE has scope, automated validation, user review, and a STOP gate.
- No PHASE contains preparatory work owned by a later unconfirmed PHASE.
- Every abstraction or structural refactor addresses a problem visible in the current requirements or code.
