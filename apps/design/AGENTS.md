# Silent Pix 設計系統藍圖

這裡是 Silent Pix 的設計系統藍圖內容；Web 照它實作，兩者互不 import。框架（元件、搜尋、外框樣式、版面檢查）在 `packages/blueprint`，元件的用法與參數見 `packages/blueprint/AGENTS.md`。這裡只放內容：`src/content/docs` 的頁面、`src/blueprint` 的畫面片段、`src/styles/tokens.css` 的 token。

## 頁面結構

- 側欄先列 **Tokens**（`src/content/docs/foundations/`）與**基礎元件**（`src/content/docs/base/<group>/<component>.mdx`，一個元件一頁），再列**頁面**（`src/content/docs/pages/<page>.mdx`，一個產品頁面一頁）。App 頁只放所有頁面共用的整體版面與導覽（Header 與其中的模式、Tools 選單），也有自己的 Screen。多個頁面都會用、但不屬於版面的通用元件（例如 Image viewer、Zoom controls）放基礎元件（例如 Media 組）。只用在單一頁面的部件放在該頁；各頁內容不同、或之後可能各自演化的（例如各頁的確認 dialog、Generate 選參考圖與 Compare 加圖的 picker），拆成各頁自己的部件，共通的外框由基礎元件（例如 Dialog）負責。
- 產品頁面內：每個部件（L1）一個 `##` 章節，依畫面由外到內、由上到下排列；最後一個章節是 `## Screen`，即整頁示範（L2）。
- 基礎元件頁以 `## Examples` 放範例，頁末放 `<Rules>`。一個元件包含幾個各自有狀態與規則的子元件時（例如 Panel 的 Bar、Collapse button），改成每個子元件一個 `##` 章節，各自有格子寬度與 `<Rules>`。基礎元件頁只畫元件的骨架與通用狀態，內容用一眼看得出是佔位的中性文字（例如 `Label`、`Value`、`Section`、`Menu item`），不用像真實產品的內容拼湊，也不發明產品沒有的項目；通用規則只寫在這裡。各頁的實例只放客製的部分（自己的內容、只有這頁才有的狀態與規則），簡介用一句話連到基礎元件頁，不重畫通用狀態；沒有客製的實例不另外展示。實作時不照抄佔位文字。只是另一個元件的固定用法或變體（例如 Task status 之於 Badge、Stage button 之於 Icon button），也併成同一頁的章節，不另立一頁；狀態多的單一元件，依性質分成幾節（例如 Button 的 Variant 與 tone、狀態、尺寸與版面）。
- 頁面標題與簡介只寫在 frontmatter，不在內文重複。
- 標題層級：H1 是頁面名稱，H2 是部件章節（或基礎元件頁的 `Examples`），H3 是個別範例與 Rules，Rules 內的分類用 H4。
- 部件章節：一行簡介，接著在 `<Gallery min>` 內逐一放 `<State>`，章節末尾放 `<Rules component>`。不另寫 `###` 標題。
- `## Screen` 不寫簡介或說明，直接放 `<Screen>`，接著是 `<Rules component="<page>-screen">`。

## 部件的粒度

- 部件是畫面上有獨立職責的一塊，例如開啟畫面、檔案面板、分頁列、一個分頁的內容。分頁內的群組、卡片、單一列等小元素不另立部件，它們的各種狀態以整個分頁的狀態呈現；整欄的狀態裡看不到的小元件狀態，用組合補成整欄的狀態（只換引用的子狀態，不畫新東西）。小元件有大量自己的狀態與規則、而且很多在整欄裡看不到時（例如 Task item、Task detail 的各區），改成獨立章節。
- 部件只展示部件本身，不放整頁畫面；整頁組合只出現在 Screen。
- 預覽框依部件大小設定（例如分頁內容最寬 `max-w-[760px]`，側欄維持原本寬度），部件放在它實際所在的底色上。會填滿視窗的部件（例如 Task browser、1200px 的 picker dialog）在預覽框給設計寬度 `min-w-[…]`，放不下時舞台左右捲動。小元件的預覽框加 `w-fit`；但內容要撐滿寬度（`w-full` 的按鈕）或有浮動定位的內容（選單、popover）時不要縮框，否則會被裁掉。
- 部件單獨展示時，拿掉只在整頁中才有意義的分隔線，例如面板的 `border-r`；片段同時給 Screen 用時不改片段，改在 `State` 的 `frame` 加 `*:border-r-0` 蓋掉。

## 畫面片段

- 每個狀態的 HTML 放在 `src/blueprint/<component>/<state>.html`。部件的 component 名稱以頁面為前綴，例如 `metadata-file-panel`、`metadata-generation-tab`；只供 Screen 使用的整頁狀態另放一組，例如 `metadata-viewer`。
- 片段只用 Tailwind utilities 與 token class，不寫行內樣式，圖示用 inline lucide SVG，文案用固定的範例文字，不引用 i18n key 或實作的檔案。靜態資源放在 `public/`，以絕對路徑引用，例如 `/landscape.svg`。
- 引用其他部件用 `data-ds-slot`，不要複製它的標記；Screen 的可點元素用 `data-ds-go` 做原型連結，不在藍圖重寫產品邏輯。
- `whitespace-pre` 的容器（例如程式碼編輯器）裡，各行 `<div>` 之間不要留換行與縮排，否則會多出空白行。

## 規則（Rules）

- 規則是寫給 agent 的規格，記錄畫面表達不出的條件、行為、數值與取捨。每條規則寫在它所屬的部件章節；跨部件或整頁的規則寫在 Screen。
- 每條規則有作者給定的 `id`（kebab-case，描述內容，例如 `link-jump`），插入或刪除其他規則時不改變。畫面上的編號（例如 `3.6`）由 CSS 自動產生，只方便對話中引用，會隨插入而改變。
- 規則多時在 Rules 內以 `####` 分類。不要把規則內容複製到範例說明。
- 規則內的 class、token 用行內程式碼標示；MDX 文字裡的 `{`、`}` 要跳脫成 `\{`、`\}`。

## Token

- `src/styles/tokens.css` 是藍圖的 token，token 有變動時同步更新 `apps/web/src/styles.css`。`src/styles/blueprint.css` 是樣式入口：先框架的 `global.css`，再 token。

## 作業

- 開發用 `pnpm dev:design`（前景執行）。驗證：`pnpm build:design` 檢查 MDX、缺少的片段與 `data-ds-go` 的目標；`pnpm check:design` 另外檢查每個預覽有沒有內容被裁掉或被擠壓（見框架的版面檢查）。
- 搬移或改寫頁面時，先確認新內容產生成功、build 通過，再移除舊檔；不要在同一個指令裡「轉換後刪除」。
- 修改後回覆受影響頁面與狀態的可點連結。
