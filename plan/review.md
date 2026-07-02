請 review 這個 Silent Pix foundation repo。

我會上傳 Codex 完成後的 repo zip。請不要繼續加 feature，而是檢查 Codex 是否正確完成「基建 / 架構基底」。

---

# Review 目標

請檢查 Codex 成品是否符合 foundation 架構，而不是是否功能完整。

請重點檢查：

1. repo structure 是否合理。
2. package names 是否正確。
3. package boundaries 是否清楚。
4. root scripts 是否合理。
5. tsconfig 是否適合 monorepo / buildable packages。
6. ESLint 是否維持 no Prettier 方向。
7. `apps/server` 是否只是 Hono foundation。
8. `apps/web` 是否只是 SolidJS foundation。
9. `apps/desktop` 是否只是 placeholder。
10. `packages/shared` 是否只放 shared contracts。
11. `packages/db` 是否只是 SQLite/Drizzle foundation，沒有過度實作。
12. env / gitignore / runtime data policy 是否正確。
13. 是否有 cross-package relative imports。
14. 是否有違反 docs / AGENTS.md。
15. 是否有會造成未來技術債的設計。

---

# 請輸出

請用以下格式 review：

```txt
## 必修問題
必須修，不修會影響架構或基建正確性。

## 建議修正
可以修，會讓架構更乾淨。

## 可以暫時接受
目前不是問題，可之後處理。

## 不應該存在的內容
如果 Codex 加了超出 foundation scope 的東西，列出來。

## 給 Codex 的下一輪短 plan
用精簡 markdown，少 token，只寫 delta / 禁區 / acceptance。
```

不要輸出很長的重述文件。請直接 review 成品。