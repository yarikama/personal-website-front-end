# Personal Website Design System: The Literary Engineer

這份規範定義了「全端工程師 / 機器學習工程師」作品集的視覺與敘事風格。

## 1. 核心美學 (Core Aesthetics)

**敘事張力**：將技術術語（如 Gradient Descent, Latent Space）轉化為文學隱喻。

**動靜平衡**：利用大量留白（White Space）平衡複雜的技術背景。

**雙重靈魂**：
- 人文部分：使用 Cormorant Garamond 字體，呈現思考的深度。
- 技術部分：使用 Overpass Mono 字體，呈現邏輯的精準。

## 2. 視覺規範 (Visual Specs)

### A. 色彩計畫 (Color Palette)

- **Paper White (#f8f7f4)**：主背景，模擬實體書本或畫冊的紙張感。
- **Ink Black (#1a1a1a)**：主文字色，模擬油墨感。
- **Faded Zinc (#71717a)**：副標題與註解，營造低調的層次。
- **Accent (Zinc-400)**：僅用於斜體字或技術細節，不使用鮮豔色彩。

### B. 字體層級 (Typography)

- **H1 (Hero Title)**: Cormorant Garamond, Light, 10rem (Desktop), Leading-none。
- **H3 (Section Title)**: Cormorant Garamond, Light, 4rem ~ 6rem。
- **Body (Narrative)**: Inter, Light, 1.125rem, Leading-relaxed。
- **Metadata (Tech Specs)**: Overpass Mono, 10px, Tracking-widest, Uppercase。

### C. 裝飾元素 (Motifs)

- **Magazine Line**: 0.5px 的水平線，寬度隨進入視窗而展開。
- **Data Stream**: 頁面邊緣的垂直旋轉文字，展示實時或靜態的訓練日誌。
- **Drop Cap**: Section 開頭的第一個字母需使用襯線斜體放大。

## 3. 專案撰寫準則 (Content Guidelines)

### A. 全端專案 (Engineering Projects)

- **標題**：具備哲學感的名稱（例：不再是 "E-commerce Backend"，而是 "The Commerce Engine"）。
- **代碼裝飾**：背景應包含該專案最核心的架構邏輯或 API 定義。
- **敘事點**：強調「系統性思考」與「開發效率」。

### B. 機器學習專案 (Intelligence Projects)

- **標題**：具備科學探索感的名稱。
- **數學公式**：使用 Inline Monospace 展示該模型背後的數學美感。
- **敘事點**：強調「數據的感知」與「模型的演化」。

## 4. 交互規範 (Interaction)

- **滾動動畫 (Reveal)**：使用 cubic-bezier(0.16, 1, 0.3, 1)，動作應緩慢而優雅，像翻開厚重的書頁。
- **Hover 效應**：標題懸停時切換為 Italic，模擬手稿的塗鴉或標註感。
- **響應式**：行動端應保持字體大小的震撼力，優先維持排版的垂直對齊。
