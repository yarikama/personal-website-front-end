# Personal Website Development Conventions

這份文件記錄開發此作品集時的偏好與慣例。

## 1. 目標受眾 (Target Audience)

- **語言**：面向英文使用者（主要是招募人員 / Recruiters）
- **中文元素**：僅用於裝飾性或文化特色展示（如姓名翻轉 Henry → 恒睿）

## 2. 視覺偏好 (Visual Preferences)

### A. 字體大小 (Font Size)

- **最小字體**：不要使用過小的字體，確保可讀性
  - 避免 `text-xs` (0.75rem) 用於重要內容
  - 一般內文至少 `text-sm` (0.875rem) 或以上
  - Metadata / 標籤可使用 `text-[0.8rem]`
- **標題**：保持視覺震撼力，使用 clamp() 實現響應式

### B. 強調色 (Accent Color)

- **Sage Green (#6b8f8b)**：主要強調色
- **Sage Light (#7fa8a3)**：Dark mode 時的強調色
- 用於：數據亮點、hover 狀態、進度條、重點文字

### C. Dark Mode

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
- **Fonts**: Cormorant Garamond, Inter, Overpass Mono, Noto Serif TC
