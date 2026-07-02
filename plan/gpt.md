# 背景

Silent Pix 是一個重開的新 repo。

長期使用模式是：

```txt
PC desktop 長期開著
手機 web 連進去
backend 是 local server
ComfyUI / GPU 才是重負載
```

初版 repo 過於追求「先跑得動的 MVP」，導致後期重構成本太大。因此這次重開 repo 的策略是：

1. 先手動定義好框架和架構邊界。
2. 半自動完成基礎建設，完善 docs / AGENTS.md / package boundaries。
3. 基底完整後，再讓 Codex 自動處理繁雜 feature 新增或修改。

這次不是 MVP-first，而是 architecture-first。

---

# 協作原則

GPT 作為第 1、2 步的技術顧問。

重要偏好：

- 為了避免技術債，第一步就要決定好核心框架。
- Codex 不知道 old repo，也不能依賴 old repo。
- 給 Codex 的 plan 必須自包含，但要精而準。
- docs / README / AGENTS.md 要少 token、精準描述，不要長篇重複。
- 已存在 docs/config 時，plan 只引用，不重寫。
- Codex plan 只寫任務 delta、禁區、驗收標準。

---

# 已定核心技術決策

```txt
Monorepo: pnpm workspace
Build: Turborepo
Language: TypeScript
Frontend: SolidJS + Vite
Backend: Hono on Node.js
Database: SQLite
DB tooling: Drizzle
Formatting: ESLint + @stylistic only
Prettier: 不使用
Desktop: 長期主使用模式
Web: 手機 / browser 連 local backend
Runtime files: filesystem
Production data: OS app data directory
Dev data: ./.local/data
```

---

