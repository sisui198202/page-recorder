# design.md

## 🎯 概要

requirements.md を満たすための
**具体的な実装方法（How）を定義する**

PageRecorderにAutoCartAgentのEC監視UI機能を移植し、ec-sites.json定義サイトの監視設定を効率化する。

---

## 🛠 技術スタック

- **Manifest Version**: V3
- **対象ブラウザ**: Chrome 120+
- **主要API**:
  - chrome.runtime
  - chrome.storage.local
  - chrome.tabs
- **外部依存**: なし
- **ビルドツール**: なし（vanilla JS）

---

## 📁 ディレクトリ構造

```
src/
├── ui/
│   ├── popup.html        # 修正対象
│   ├── popup.js          # 修正対象
│   └── popup.css         # 修正対象
├── config/
│   ├── ec-sites.json     # 新規追加（sync-ec-sites.jsで同期）
│   └── scheduled-watch-sites.json  # 変更なし
└── background/
    └── background.js     # 変更なし
```

---

## 🧠 設計方針

### 採用方針: AutoCartAgentのパターンを流用

- **理由**: AutoCartAgentで実績のあるconfig-loader.js、サイトトグルUI、autoFillMonitorSettings()のパターンを流用することで、実装の信頼性と保守性を確保する
- **特徴**: popupに閉じた実装とし、background.jsへの影響を最小化する

### 他案との比較

| 案  | 内容                             | 採否 | 理由                            |
| --- | -------------------------------- | ---- | ------------------------------- |
| A   | background.jsでec-sites.json読込 | ❌   | popup完結で十分、複雑化を避ける |
| B   | popup.jsでインライン読込         | ✅   | シンプルで十分な要件を満たす    |

---

## 🧩 対応要件マッピング（最重要）

| 要件                               | 対応方法                                                                              |
| ---------------------------------- | ------------------------------------------------------------------------------------- |
| FR-1: ec-sites.json連携基盤        | popup.jsにloadEcSites()関数を追加。fetch()でec-sites.jsonを読込み、キャッシュして返す |
| FR-2: サイト選択UI                 | popup.htmlにサイトトグルセクションを追加。popup.jsでrenderSiteToggles()により動的生成 |
| FR-3: セレクタ・キーワード自動補完 | popup.jsにautoFillFromEcSites()関数を追加。単一サイトON検出時に既存入力欄へ自動入力   |
| FR-4: URL登録（サイト選択から）    | popup.htmlにサイト選択ドロップダウン付きURL入力セクションを追加                       |

🚨 すべての要件に対応必須
🚨 未対応要件がある場合は実装禁止

---

## 🗂 変更対象

### 新規作成

- `/src/config/ec-sites.json` - shared/ec-sites-master.jsonからsync-ec-sites.jsで同期

### 修正対象

- `/src/ui/popup.html` - サイトトグルセクション、URL登録セクション追加
- `/src/ui/popup.js` - ec-sites.json読込、トグル生成、自動補完、URL登録処理
- `/src/ui/popup.css` - トグルスイッチのスタイル追加
- `/manifest.json` - web_accessible_resourcesにec-sites.json追加（必要な場合）

### 変更なし（確認済）

- `/src/background/background.js` - popup完結のため変更不要
- `/src/config/scheduled-watch-sites.json` - 既存機能、影響なし

---

## 🧩 変更内容

### 1. ec-sites.json読込機能（FR-1対応）

popup.jsに以下を追加:

```javascript
// ec-sites.jsonキャッシュ
let ecSitesCache = null;

/**
 * ec-sites.jsonを読み込む
 * @returns {Promise<Array>} サイト配列
 */
async function loadEcSites() {
  if (ecSitesCache) return ecSitesCache;
  try {
    const response = await fetch(
      chrome.runtime.getURL("src/config/ec-sites.json"),
    );
    const data = await response.json();
    ecSitesCache = data.sites || [];
    return ecSitesCache;
  } catch (error) {
    console.error("[PageRecorder] ec-sites.json読込エラー:", error);
    return [];
  }
}

/**
 * サイトIDからサイト設定を取得
 * @param {string} siteId
 * @returns {Object|null}
 */
function getEcSiteById(siteId) {
  if (!ecSitesCache) return null;
  return ecSitesCache.find((site) => site.id === siteId) || null;
}
```

---

### 2. サイトトグルUI（FR-2対応）

#### popup.html追加セクション

```html
<!-- EC監視サイト設定セクション -->
<div class="section" id="ecSiteSection">
  <div class="section-header">
    <span class="section-title">📋 EC監視サイト</span>
    <span class="toggle-icon">▼</span>
  </div>
  <div class="section-content">
    <div id="siteTogglesContainer">
      <!-- 動的生成 -->
    </div>
  </div>
</div>
```

#### popup.js トグル生成

```javascript
/**
 * サイトトグルを動的生成
 */
async function renderSiteToggles() {
  const sites = await loadEcSites();
  const container = document.getElementById("siteTogglesContainer");
  if (!container || sites.length === 0) return;

  // 保存済み状態を取得
  const { ecSiteEnabled = {} } =
    await chrome.storage.local.get("ecSiteEnabled");

  container.innerHTML = sites
    .map(
      (site) => `
    <div class="site-toggle-item">
      <span class="site-label">${site.name}</span>
      <div class="toggle-switch ${ecSiteEnabled[site.id] ? "active" : ""}"
           data-site-id="${site.id}">
        <div class="toggle-slider"></div>
      </div>
    </div>
  `,
    )
    .join("");

  // トグルイベント登録
  container.querySelectorAll(".toggle-switch").forEach((toggle) => {
    toggle.addEventListener("click", handleSiteToggle);
  });

  // 自動補完チェック
  checkAutoFill(ecSiteEnabled);
}

/**
 * トグルクリック処理
 */
async function handleSiteToggle(event) {
  const toggle = event.currentTarget;
  const siteId = toggle.dataset.siteId;
  const isActive = toggle.classList.toggle("active");

  // storage保存
  const { ecSiteEnabled = {} } =
    await chrome.storage.local.get("ecSiteEnabled");
  ecSiteEnabled[siteId] = isActive;
  await chrome.storage.local.set({ ecSiteEnabled });

  // 自動補完チェック
  checkAutoFill(ecSiteEnabled);
}
```

---

### 3. セレクタ・キーワード自動補完（FR-3対応）

```javascript
/**
 * 単一サイトON時に自動補完
 * @param {Object} ecSiteEnabled - サイト有効状態
 */
function checkAutoFill(ecSiteEnabled) {
  const enabledSites = Object.entries(ecSiteEnabled)
    .filter(([_, enabled]) => enabled)
    .map(([id]) => id);

  if (enabledSites.length === 1) {
    autoFillFromEcSites(enabledSites[0]);
  }
}

/**
 * ec-sites.jsonからセレクタ・キーワードを自動入力
 * @param {string} siteId
 */
function autoFillFromEcSites(siteId) {
  const site = getEcSiteById(siteId);
  if (!site) return;

  // 既存の入力欄要素
  const selectorInput = document.getElementById("monitorSelector");
  const keywordInput = document.getElementById("monitorKeyword");

  // productPage.inStock または monitoring.checkSelector を使用
  const selector =
    site.productPage?.inStock || site.monitoring?.checkSelector || "";
  const keyword =
    site.productPage?.inStockText || site.monitoring?.checkKeyword || "";

  if (selectorInput && selector) {
    selectorInput.value = selector;
  }
  if (keywordInput && keyword) {
    keywordInput.value = keyword;
  }

  console.log(
    `[PageRecorder] 自動補完: ${site.name} - selector=${selector}, keyword=${keyword}`,
  );
}
```

---

### 4. URL登録機能（FR-4対応）

#### popup.html追加セクション

```html
<!-- URL登録セクション -->
<div class="section" id="urlRegistrationSection">
  <div class="section-header">
    <span class="section-title">🔗 監視URL登録</span>
    <span class="toggle-icon">▼</span>
  </div>
  <div class="section-content">
    <div class="url-register-form">
      <select id="urlSiteSelect">
        <option value="">-- サイトを選択 --</option>
        <!-- 動的生成 -->
      </select>
      <input type="text" id="urlInput" placeholder="監視するURLを入力" />
      <button id="addUrlBtn" class="btn-primary">追加</button>
    </div>
    <div id="registeredUrlList">
      <!-- 登録済みURL一覧 -->
    </div>
  </div>
</div>
```

#### popup.js URL登録処理

```javascript
/**
 * サイト選択ドロップダウンを生成
 */
async function renderSiteSelect() {
  const sites = await loadEcSites();
  const select = document.getElementById("urlSiteSelect");
  if (!select) return;

  sites.forEach((site) => {
    const option = document.createElement("option");
    option.value = site.id;
    option.textContent = site.name;
    select.appendChild(option);
  });
}

/**
 * URL登録ボタン処理
 */
async function handleAddUrl() {
  const siteId = document.getElementById("urlSiteSelect").value;
  const url = document.getElementById("urlInput").value.trim();

  if (!siteId || !url) {
    alert("サイトとURLを入力してください");
    return;
  }

  // 登録済みURL取得
  const { registeredUrls = [] } =
    await chrome.storage.local.get("registeredUrls");

  // 重複チェック
  if (registeredUrls.some((item) => item.url === url)) {
    alert("このURLは既に登録されています");
    return;
  }

  // 追加
  registeredUrls.push({ siteId, url, addedAt: Date.now() });
  await chrome.storage.local.set({ registeredUrls });

  // 入力クリア
  document.getElementById("urlInput").value = "";

  // 一覧更新
  renderRegisteredUrls();
}

/**
 * 登録済みURL一覧を表示
 */
async function renderRegisteredUrls() {
  const { registeredUrls = [] } =
    await chrome.storage.local.get("registeredUrls");
  const container = document.getElementById("registeredUrlList");
  if (!container) return;

  if (registeredUrls.length === 0) {
    container.innerHTML = '<p class="no-urls">登録されたURLはありません</p>';
    return;
  }

  container.innerHTML = registeredUrls
    .map((item, index) => {
      const site = getEcSiteById(item.siteId);
      return `
      <div class="url-item">
        <span class="url-site">${site?.name || item.siteId}</span>
        <span class="url-text" title="${item.url}">${truncateUrl(item.url)}</span>
        <button class="btn-delete" data-index="${index}">✕</button>
      </div>
    `;
    })
    .join("");

  // 削除ボタンイベント
  container.querySelectorAll(".btn-delete").forEach((btn) => {
    btn.addEventListener("click", handleDeleteUrl);
  });
}

/**
 * URL削除処理
 */
async function handleDeleteUrl(event) {
  const index = parseInt(event.currentTarget.dataset.index, 10);
  const { registeredUrls = [] } =
    await chrome.storage.local.get("registeredUrls");

  registeredUrls.splice(index, 1);
  await chrome.storage.local.set({ registeredUrls });

  renderRegisteredUrls();
}

/**
 * URL表示用に短縮
 */
function truncateUrl(url, maxLength = 40) {
  if (url.length <= maxLength) return url;
  return url.substring(0, maxLength - 3) + "...";
}
```

---

### データ構造変更

#### chrome.storage.local 追加キー

```javascript
// サイト有効状態
{
  "ecSiteEnabled": {
    "yodobashi": true,
    "toysrus": false,
    "amiami": true
  }
}

// 登録済みURL
{
  "registeredUrls": [
    {
      "siteId": "yodobashi",
      "url": "https://www.yodobashi.com/product/100000001007...",
      "addedAt": 1724644800000
    }
  ]
}
```

---

## 🧩 Chrome拡張連携

### popup

- **操作起点**: サイトトグル切替、URL登録
- **表示内容**: ec-sites.jsonのサイト一覧、登録済みURL一覧

### background script

- **役割**: 変更なし（popup完結）

### メッセージ連携

本機能ではpopup ⇔ background間のメッセージ連携は不要。
popup.js内でchrome.storage.localを直接操作する。

---

## ⚠️ 影響範囲

- **関連機能**: 単一URL監視モードのセレクタ・キーワード入力欄
- **関連ファイル**: popup.html, popup.js, popup.css
- **UIへの影響**: 新セクション2つ追加（EC監視サイト、監視URL登録）
- **外部依存**: ec-sites.json（shared/ec-sites-master.jsonからの同期）

---

## 🧪 テスト方針

### 手動テスト

1. **サイトトグル表示確認**
   - popup開く → EC監視サイトセクションにec-sites.json登録サイトが表示される

2. **トグル状態保存確認**
   - サイトON → popup再表示 → ON状態が維持されている

3. **自動補完確認**
   - 単一サイトON → セレクタ・キーワード入力欄に値が入る
   - 複数サイトON → 自動補完されない

4. **URL登録確認**
   - サイト選択 + URL入力 + 追加 → 一覧に表示
   - 削除ボタン → 一覧から消える

5. **既存機能共存確認**
   - 単一URL監視、複数URL監視、定時監視が正常動作

---

## 🚧 リスクと対策

| リスク                     | 対策                                                 |
| -------------------------- | ---------------------------------------------------- |
| popup.jsが1800行超で肥大化 | 関数を論理的にグループ化、将来的にモジュール分割検討 |
| ec-sites.json読込失敗      | エラーハンドリングでUI破綻を防ぐ                     |
| 既存storage keyとの衝突    | 新規キー名は既存と重複しない名前を使用               |

---

## 🔀 代替案

| 案  | 内容                                   | 採否 | 理由                                     |
| --- | -------------------------------------- | ---- | ---------------------------------------- |
| A   | config-loader.jsを別ファイルとして追加 | ❌   | popup.jsで完結可能、ファイル増加を避ける |
| B   | popup.js内にインライン実装             | ✅   | シンプルで保守しやすい                   |
| C   | 全サイト強制表示                       | ❌   | 不要サイトが多いと煩雑                   |

---

## ❓ 未確定事項

- ec-sites.jsonのweb_accessible_resources追加要否（fetch成功なら不要）
- UI配置場所の詳細（既存セクションとの並び順）

---

## 📝 decisions.md記録対象

- popup.js内インライン実装を採用した理由
- storage keyの命名規則（ecSiteEnabled, registeredUrls）

---

## 📝 承認

- [x] ユーザー承認済み

---

## 🚨 実装ルール（最重要）

- 本design.mdに記載された内容のみ実装可能
- 未記載仕様の実装は禁止
- 不明点は requirements / decisions に戻る

---

## 🎯 最終原則

👉 requirementsを100%満たす
👉 実装方法を曖昧にしない
👉 DOMは必ず検証する（該当時）
👉 迷ったら実装しない
