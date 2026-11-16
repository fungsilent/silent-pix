# Blueprint 框架

`@silent-pix/blueprint` 把 Astro + Starlight 包成設計系統藍圖用的文件站：元件、片段載入、右側目錄、自製搜尋、外框樣式與版面檢查。藍圖專案（例如 `apps/design`）只放內容。文件結構參考 Ark UI 說明文件：標題、短說明、逐項範例，規格另列。

## 用法

- 藍圖專案依賴 `@silent-pix/blueprint`、`astro`、`@astrojs/starlight`（Starlight 產生的虛擬模組會從專案本身解析它，所以專案必須直接安裝）。
- `astro.config.mjs`：`integrations: [blueprint({ title, sidebar, css })]`。`css` 是專案的樣式入口，內容依序是 `@import '@silent-pix/blueprint/global.css';` 與專案自己的 token（同一份 Tailwind 編譯，token 的 `@theme` 才會產生對應的 class）。固定設定由框架負責：自製搜尋（關掉只在 build 後可用的 Pagefind）、不加上一頁／下一頁卡片、右側目錄由 `route-data` 依章節產生、PageTitle／Search／ThemeSelect 換成框架的元件，並注入 `/search-index.json` 與 Tailwind。
- `src/content.config.ts`：`export { collections } from '@silent-pix/blueprint/content'`。
- 頁面裡的元件從 `@silent-pix/blueprint/components/<Name>.astro` 匯入。
- 專案的 token 必須提供外框用到的 `--sp-*`（canvas、surface、elevated、hover、selected、line、line-subtle、fg、fg-title、fg-secondary、fg-muted、accent、accent-fg、on-stage、field、field-border、backdrop、scroll-thumb）與 `--shadow-popover`，並以 `[data-theme]` 切換 Dark／Light；字型與文字色只套在 `.ds-frame`，不要放 `:root`／`*`／`body` 這類全域規則。

## 元件

- `<State component state label description? frame? themes?>`：一個範例。`label` 是給人看的標題；`description` 只在需要解釋圖中條件時提供，最多兩行，不寫行為規格。`frame` 是預覽框的 class。預設跟著 Starlight 的主題；只有需要對照主題時才用 `themes="both"`，讓 Dark／Light 並列。
- `<Gallery min>`：一個章節的狀態並排成格子，`min` 是每格最小寬度。
- `<Screen frame?>`：L2 的控制列（每個 Slot 一個狀態選單和位址複製鈕）加上整頁畫面框；主題跟著 Starlight。選單 focus 時，上下鍵切換該選單的狀態（循環、不展開），左右鍵移到前一個／後一個選單（循環）。
- `<Slot name component states labels? empty?>`：Screen 裡可切換的區塊。`states` 以逗號分隔，`labels` 以 `|` 分隔，順序與 `states` 相同。`empty="<標籤>"` 多一個什麼都不顯示的狀態 `none`；在 `states` 裡寫 `none` 決定它的位置，覆蓋層把 `none` 放第一個，預設就是沒有 dialog。不做 Slot 裡再切 Slot 的巢狀選單，一律攤平成同一層。
- `<Fixed component state>`：Screen 裡固定狀態的區塊，不出現在控制列。
- `<Switch name>` 與 `<Case state label>`：Screen 裡切換一整塊版面，每個 Case 裡可以再放 Slot。第一個 Case 是預設；控制列只顯示目前版面用得到的選單，網址也只記錄這些選單。只有一層 Slot 時用 `empty`，需要整塊版面互換時才用 Switch。
- `<Rules component part?>`：一個部件的規格，預設收合，錨點是 `<component>/rules`；同一個元件的規則分到幾個章節時加 `part`，錨點變成 `<component>/rules/<part>`。用規則連結進入時自動展開。內含 `<ul class="ds-rules">` 與 `<Rule component id>`。
- `<TokenValues />`：放在 token 頁，把 `[data-ds-value="<name>"]` 標上該主題下 `--sp-<name>` 的實際值。

## 片段

- 片段是藍圖專案裡的 `src/blueprint/<component>/<state>.html`（框架以 Vite 專案根目錄的 `/src/blueprint/` 讀取），由 State／Slot／Fixed 原樣插入。
- 片段裡的 `<div data-ds-slot="<component>" data-ds-state="<state>"></div>` 在 build 時換成該部件的片段，可以多層；缺片段或循環引用時 build 失敗並列出引用路徑。
- Screen 的互動用原型連結：片段的可點元素加 `data-ds-go="<state>"`，點了就切到該 slot 的那個狀態。目標必須是該 slot 列出的狀態，否則 build 失敗。
- `<State>`／`<Slot>` 的屬性值裡不要用 `>`：讀取這些標籤（右側目錄、搜尋、狀態標籤）時以 `>` 判斷標籤結尾。

## 位址與搜尋

- 穩定錨點：`<component>/state/<state>`、`<component>/rule/<id>`、`<component>/rules`。Screen 的狀態組合寫在網址錨點，例如 `#viewer=generation-jump`；只在使用者操作 Screen 時才改寫網址，不覆蓋同一頁其他錨點。
- 範例標題旁、規則末尾、Screen 控制列的複製鈕會複製位址（頁面路徑＋錨點），可以直接貼給 agent。
- 搜尋索引直接取自原始檔（頁面、`<State>` 的標籤與片段文字、`<Rule>` 全文、Screen 的 Slot 狀態），`astro dev` 下即時更新，不需要 build。

## 樣式

- 文件外框沿用產品的設計語言：Starlight 的 `--sl-color-*` 在 `global.css` 一次對應到 `--sp-*` token（Dark／Light 隨 token 切換，不另寫主題區塊）；側欄選中用 `--sp-selected` 半透明底、hover 用 `--sp-hover`，不用 accent 實底；按鈕與 summary 維持箭頭游標；文件外框的所有捲動區（側欄、目錄、舞台）用 App 的細捲軸（8px、圓角、無箭頭，`--sp-scroll-thumb`），不套到 `.ds-frame` 內；控制高度、圓角用 App 的尺度（28px 控制、6px 圓角）。
- 字級用 App 的緊湊尺度：頁面標題 20px／600、內文 13px、章節標題 15px／600、章節簡介 12px、範例標題 12px／500、範例圖說 11px、Rules 內文 12px、側欄與目錄 12px、群組標籤 10px 大寫。簡介與說明使用 muted 色，文字寬度最多 68ch。
- 版面像桌面設計審閱工具：部件章節之間以 `line-subtle` 分隔；章節內的狀態放在 `<Gallery min>` 格子裡並排，容器夠寬時自動多欄。
- 每個狀態是一張卡片：上方 36px 標題列（標題、位址複製鈕，高度一致讓並排的舞台對齊），中間是 `canvas` 底加點陣的舞台，部件置中並帶淡陰影，選填說明放在舞台下方當圖說。舞台放不下設計寬度時左右捲動。
- Rules 是章節末尾一列可展開的卡片（chevron＋Rules），平常只佔一行。不加 Starlight 的上一頁／下一頁卡片。
- 標題列同 App 的 Bar：只有 Starlight 本身的一條全寬底線；左側站名、搜尋框（16rem），右側是 App 式 28px 主題圖示鈕（`ThemeToggle`），不顯示社群圖示的分隔線。Starlight 為 markdown `details`、標題加的邊框與間距在 Rules 內一律蓋掉。
- 章節間距 48px（含分隔線），格子間距 16px。文件樣式只作用於文件外框與文字，不改變 `.ds-frame` 內產品 UI 的字級、間距與版面。

## 版面檢查

- `blueprint-check`（在藍圖專案目錄執行）：build 後用 preview 開每一頁，在 1280／1600／2560px 三種寬度檢查每個預覽：內容超出框、沒有設計寬度的框超出舞台，以及跟設計寬度（框的 `min-width`，沒有就 1400px）下的排版相比多出的文字截斷或短文字斷行。有問題時結束碼 1。
- 需要 Chromium：預設用 Playwright 快取（`~/.cache/ms-playwright`）裡的 headless shell，或以 `CHROMIUM_PATH` 指定。
- Astro 的 dev 與 preview 同一專案都只允許一個，第二次啟動只會回報已在跑；一律用 `astro preview stop`／`astro dev stop` 關，不要靠記下的 PID。測試時不要留下自己開的伺服器。
