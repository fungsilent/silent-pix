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

## Sections

Use these in this order. Drop any that would be empty; do not invent extras.

### `## Context`

Two or three bullets naming what in the **current code** blocks the request — with the file and the symbol, not a vague complaint. Then one sentence of goal. No background the user already gave you.

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

### `## 執行順序`

A numbered list inside a fenced block, one line per step, naming files not prose. Mark steps that **must land in the same commit** and steps that are **spikes before committing to a contract**.

```
4.  packages/shared  api/image.ts、api/task.ts、event/task.ts     ← 與 7 同一個 commit
5.  apps/server      lib/image/{hash,meta,store}.ts（+ image-size）
```

Anything destructive (reset, migration, deleting data) gets its own paragraph here with the backup command spelled out.

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
