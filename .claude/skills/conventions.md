# Personal Website Development Conventions

這份文件記錄開發此作品集時的偏好與慣例。

## 1. 目標受眾 (Target Audience)

- **語言**：面向英文使用者（主要是招募人員 / Recruiters）
- **中文元素**：僅用於裝飾性或文化特色展示（如姓名翻轉 Henry → 恒睿）

## 2. 視覺偏好 (Visual Preferences)

### A. 字體與字級 (Type)

- **字體**：標題 Cormorant Garamond、內文 Atkinson Hyperlegible Next、標籤 Overpass Mono、中文 Noto Serif TC。
  - 不要用 Inter、Geist、Satoshi、Space Grotesk、DM Sans、Manrope、Plus Jakarta Sans、Poppins：這些是 AI 生成網站最常見的預設字，擁有者看了會覺得「AI 味」。
  - 付費字體（Klim、Dinamo、Grilli 等）不考慮。
- **最小字級 15px**：頁面上的字不得小於 15px。
  - `text-xs` 是 15px、`text-sm` 是 16px（`src/index.css` 的 `@theme`）。說明文字、標籤、日期、徽章直接用這兩個。
  - 頁面元件（sections、layout、ui、pages）不要寫死 `text-[13px]`、`text-[0.875rem]` 這類更小的字級。
  - 例外：圖表（SVG）和簡報投影片裡的字，因為會跟著圖一起縮放。
- **文字對比度**：所有文字都要達到 WCAG AA，對它所在的底色至少 4.5:1（24px 以上的大字 3:1），淺色、深色模式都要。
  - 文字只用 `text-ink`、`text-ink-light`、`text-zinc-faded`、`text-sage-ink`，SVG 圖表裡的字用對應的 `fill-*`。
  - `zinc-300/400/500`、`sage`、`sage-light` 在紙色底上只有 1.4–3.3:1，只能畫線和形狀，不能當字的顏色。純裝飾的符號（拖曳把手、連結間的 `|`）加 `aria-hidden` 後可以例外。
  - 白字放在 sage 色塊上時，色塊用 `bg-sage-ink`。
  - 不要用 `opacity-*` 或 `/50` 這類透明度把文字調淡；需要次要文字就用 `text-zinc-faded`。停用中的按鈕不在此限。
  - 兩層檢查：
    - `tests/contrast.test.ts`（跟著 `npx vitest run` 跑）檢查顏色 token 的對比度，並擋下寫在 class 或 `text:`、`label:` 這類值裡的淡色。
    - `npm run check:contrast` 用 Playwright 打開全站每一頁，淺色、深色各一次，量畫面上每段文字實際的對比度。它抓得到單看程式碼看不出的情況：顏色放在變數裡、用透明度調淡、字畫在 SVG 色塊上。改顏色、加新圖表後要跑一次，結果要是 0。CI 的 `contrast` 工作在每個 PR 都會跑它。
    - Claude Code 在這個 repo 改了 `src` 底下的檔案後，`.claude/hooks/design-rules.sh` 會自動跑上面兩個單元測試，失敗時要先修好再繼續。
  - 字放在有底色的格子或色塊上（熱度圖、sage 淡底的方框）時，用 `ink` 或 `ink-light`：`zinc-faded` 只在底色淡於 sage 15%、zinc-400 20% 時才夠深。
- **不用斜體**：全站沒有 `italic`。強調用 `<em>`，它在 `index.css` 是 500 字重、正體。
- **標題**：保持視覺震撼力，使用 clamp() 實現響應式。

### B. 分隔與形狀 (Dividers and Shapes)

- **不用細分隔線**：區塊之間、標題下、清單項目之間都用留白分開，不畫全寬細線（舊的 `MagazineLine` 已刪除），也不用 `divide-x/y`。
  - 保留的只有功能性的邊：固定在畫面上的頁首、頁尾列的邊，元件自己的外框（聊天框、圖表框），連結的底線。
- **圓角**：沒有直角的方框、按鈕、標籤或圖片。
  - `rounded-full`：小按鈕、篩選器、標籤。
  - `rounded-xl`：卡片、輸入框、連結卡片、程式碼區塊、影片。
  - `rounded-2xl`：大面板和圖表外框。
  - 幾 px 的小圓角：拍立得、長條圖、小方格。

### C. 換風格前先比較 (Compare Before Changing)

- 換字體、換配色、加新的視覺元素之前，先用網站的真實內容做 artifact 並排比較，擁有者確認後才改程式碼。
- 擁有者常用「AI 味」判斷：模板感、通用的裝飾（細線、斜體標題、等寬大寫標籤堆疊、方框）都算。用網站自己的實體物件語言（拍立得、黑膠唱片）取代，而不是加通用裝飾。

### D. 改字級、間距後要檢查 (After Changing Type or Spacing)

- Experience 的釘住轉盤：最長的角色（MaiAgent，五條重點）在 900px 高的螢幕要放得下（面板高度最少 560、最多 780px，矮於 880px 的螢幕改用平鋪時間軸）。
- 頁首導覽列在 1024px 寬仍是一行。
- 頁面在 390px 寬不會左右捲動。
- 技能表換行時逗號不落在行首。
- `npx vitest run` 包含 `tests/design-rules.test.ts`，上面的字級、斜體、細線、字體規則違反時會失敗。

### E. 強調色 (Accent Color)

- **Sage (#6b8f8b，深色模式 #7fa8a3)**：線條、形狀、進度條、色塊。
- **Sage Ink (#4f6a67，深色模式 #7fa8a3)**：sage 色的文字，以及上面要放白字的色塊。
- 用於：數據亮點、hover 狀態、進度條、重點文字

### F. Dark Mode

- **必須支援**：網站需要有深色模式
- 使用 CSS 變數切換顏色
- ThemeToggle 放置於 Header 導航列
- 記住用戶偏好（localStorage）
- 支援系統偏好設定 (prefers-color-scheme)

## 3. 互動設計 (Interaction Design)

### A. 動畫效果

- **Streaming Text**：LLM 風格的文字串流效果（用於 About section）
- **Flip Animation**：滑鼠懸停時的翻轉動畫（rotateX / rotateY）
- **Parallax**：滑鼠移動時的視差效果（Hero photo, GeometricDecor）
- **Scroll-triggered**：滾動觸發的動畫（IntersectionObserver）

### B. 自訂游標

- 三角形游標設計
- 帶有漸退軌跡線
- Hover 在可點擊元素時填充顏色

## 4. 版面配置 (Layout)

- **固定版面**：動畫不應造成版面跳動
  - 使用 CSS Grid 疊加來預留空間
  - 或使用 invisible 元素佔位
- **段落串流**：依序進行，前一段完成後才開始下一段

## 5. 內容管理 (Content)

### A. 專案分類

- 僅保留：Engineering、ML/AI
- 已移除：Design、Research（無相關專案）

### B. 徽章資訊

- 包含年份（如：2024 Presidential Hackathon Winner）
- 外部連結使用展開式箭頭按鈕

## 6. 技術堆疊 (Tech Stack)

- **Framework**: React + TypeScript + Vite
- **Styling**: Tailwind CSS v4
- **Icons**: Lucide React
- **Fonts**: Cormorant Garamond, Atkinson Hyperlegible Next, Overpass Mono, Noto Serif TC
