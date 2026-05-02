# 泰文字母互動學習 App — HANDOFF

> 從 Claude.ai artifact 移交到 Claude Code 的接續開發文件
> 建立日期：2026-05-02

---

## 一、專案定位

這是一個**泰文字母基礎參考工具**，作為現有 Thai Learning Tool（單字／例句 flashcard）的**前置學習階段**。

兩者關係：
```
[字母 App]  →  [Thai Learning Tool]
 學字母發音       學單字、例句、聽力
 stage 0          stage 1+
```

未來可能整合成同一個 PWA 的兩個分頁，或保持獨立部署。

---

## 二、目前完成度（Stage 0 Prototype）

**單檔 HTML artifact**：`thai-alphabet.html`

### 已實作功能

- **三大模式**：瀏覽 / 測驗 / 書寫
- **三大分類**：子音 44 / 母音 25 / 聲調符號 6
- **瀏覽模式**
  - Grid 卡片，子音頂部色條標示聲調類別（中／高／低音）
  - 子音聲調類別篩選器（tone filter pills）
  - 點擊彈出 modal：字母名稱、羅馬拼音、中文音、代表詞＋emoji 圖示、聲調類別、播放鍵
- **測驗模式**
  - 兩種方向：看字母選讀音 ↔ 看讀音選字母
  - 即時對錯反饋、自動播放正解發音
  - 累計總題／對／錯計數
  - 進度條（以 20 題為滿格基準，可調）
- **書寫模式**
  - 左側字母清單，右側大字顯示
  - 格線背景輔助筆畫對位
  - 上一個／下一個導覽、播放發音
  - 書寫提示文字（圓圈 หัว 起筆原則）
- **發音**：Web Speech API（`th-TH`，rate 0.7）

### 視覺系統（沿用 Thai Tool 鎖定色票）

```css
--bg: #0F1814;
--panel: #1A2B24;
--card: #243830;
--card-flipped: #2D4A3E;
--gold: #C4A574;
--text: #F5F0E8;
--danger: #E8948F;

--tone-mid: #C4A574;    /* 金色 */
--tone-high: #E8B86F;   /* 暖橘 */
--tone-low: #7FA68A;    /* 綠色 */
```

### 字體堆疊

- 顯示字體：`Cormorant Garamond`（serif，標題用）
- 泰文：`Noto Sans Thai`
- 內文：`Sarabun`
- 等寬：`JetBrains Mono`（拼音、技術標籤）

---

## 三、資料結構

### 三組常數（位於同一 HTML 檔內 `<script>` 區塊）

```js
const CONSONANTS = [
  { c, name, roma, zh, tone, rep, repIcon },
  // ... 44 個
];

const VOWELS = [
  { c, name, roma, zh, tone },
  // ... 25 個
];

const TONES = [
  { c, name, roma, zh, tone, rep },
  // ... 6 個
];

const CATEGORIES = [
  { id: "consonant" | "vowel" | "tone", label, count, data }
];
```

### 欄位說明

| 欄位 | 說明 | 範例 |
|---|---|---|
| `c` | 字母本身（泰文） | `ก` |
| `name` | RTGS 字母名稱 | `ko kai` |
| `roma` | 羅馬拼音 | `k` |
| `zh` | 中文擬音 | `格` |
| `tone` | `mid` / `high` / `low` / `none` | `mid` |
| `rep` | 代表詞（泰文＋中譯） | `ก ไก่ (雞)` |
| `repIcon` | 代表詞 emoji | `🐔` |

⚠️ 已知資料待校對的項目：
- `ฬ จุฬา` 我譯為「風箏」，但更精確應為「妙雲」或「裝飾物」，建議找老師確認
- `ฏ ปฏัก` 譯為「刺棒」，可再確認
- 母音的中文擬音（如 `ㄟ`、`ㄝ`、`ㄛ`）採用注音符號方式呈現，可能要視風格統一改為國語擬音字

---

## 四、Claude Code 接手後的建議重構方向

### 4.1 多檔案結構

```
thai-alphabet/
├── index.html
├── manifest.json           # PWA
├── sw.js                   # service worker
├── assets/
│   ├── icons/              # PWA icons (192/512)
│   └── audio/              # 之後存真人音檔
│       ├── consonants/
│       │   ├── ko-kai.mp3
│       │   └── ...
│       └── vowels/
├── css/
│   ├── tokens.css          # CSS variables（與 Thai Tool 共用）
│   ├── base.css
│   ├── browse.css
│   ├── quiz.css
│   └── write.css
├── data/
│   ├── consonants.json
│   ├── vowels.json
│   └── tones.json
└── js/
    ├── main.js
    ├── audio.js            # 抽象播放層（TTS / 真人音檔可切換）
    ├── browse.js
    ├── quiz.js
    ├── write.js
    └── modal.js
```

### 4.2 跟 Thai Tool 共用的部分

如果之後要整合，建議抽出：
- **`tokens.css`**：色票、字體、間距變數
- **`audio.js`**：發音播放層（兩個 app 都需要）
- **PWA shell**：service worker 邏輯類似

### 4.3 待加功能（依優先級）

**P0 — 核心體驗強化**
1. **真正的筆畫動畫**
   - 用 SVG `<path>` + `stroke-dasharray` 動畫示範筆順
   - 每個子音準備一份 SVG（44 個 + 母音常見的）
   - 可用工具：`thai-stroke-order` 開源 SVG 資料集，或手動描繪
2. **真人音檔取代 TTS**
   - 抽象 `audio.js` 介面，TTS 作為 fallback
   - 你（或老師）錄音後依命名規則放入 `assets/audio/`
3. **localStorage 進度追蹤**
   - 已學會的字母、測驗答錯次數、複習頻率
   - 結構參考 Thai Tool 的 progress 邏輯

**P1 — 學習效率**
4. **間隔重複（SRS）測驗模式**
   - 答錯的字母提高出現頻率
   - 連續答對 N 次後降低頻率
5. **拼字練習**
   - 給羅馬拼音，用螢幕鍵盤組出泰文字
   - 螢幕泰文鍵盤元件（有開源實作可參考）
6. **聲調規則練習**
   - 給一個「子音類別 + 母音長短 + 結尾」組合，問實際聲調
   - 這是泰文最難的部分，值得獨立做

**P2 — 整合**
7. **PWA 化**：manifest.json + service worker（離線可用）
8. **GitHub Pages 部署**（同 Thai Tool 流程）
9. **從字母 App 跳轉到 Thai Tool**（深層連結，例如點擊代表詞跳到該詞的 flashcard）

### 4.4 已知技術債

- **Web Speech API 在 Windows 的泰文發音品質差**，Mac/iOS 較好。真人音檔是必須的長期方案。
- **書寫模式目前是靜態的**，沒有真正的筆順動畫，僅靠提示文字輔助。
- **測驗的隨機抽題沒有避免短期重複**，可能連抽到同一題。
- **`–` 在母音和聲調符號中是佔位符**，目前用普通 `–` 字元，視覺上 OK 但若改成圓圈（如 `◌`）會更標準（unicode `U+25CC` DOTTED CIRCLE）。

### 4.5 風格決策已鎖定

- **不要改色票**：與 Thai Tool 一致是核心原則
- **字體堆疊不要動**：Cormorant Garamond + Sarabun + Noto Sans Thai 是 editorial 風格的關鍵
- **金色聲調條設計**：不要改成圓點或徽章，色條低調但有資訊量
- **`prefers-reduced-motion`**：所有動畫要記得加 fallback（目前 modal 動畫沒加，要補）

---

## 五、給 Claude Code 的初始 prompt 建議

當你在 Mac 上開啟 Claude Code 時，可以這樣起頭：

```
我有一個泰文字母互動學習 app 的 prototype（單檔 HTML），
要你幫我重構成多檔案結構並轉成 PWA。
詳細需求請看 HANDOFF.md。

第一步：請先讀 HANDOFF.md 跟 thai-alphabet.html，
然後規劃資料夾結構，等我確認後再動手拆檔。
```

之後再依 P0 優先級逐步推進。

---

## 六、檔案清單

需要帶到 Claude Code 的檔案：
- `thai-alphabet.html`（這次的 artifact）
- `HANDOFF.md`（本文件）

可選：
- 你 Thai Learning Tool 的 `tokens.css`（如果已抽出），方便共用變數

---

完成於 2026-05-02
