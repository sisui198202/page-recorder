# PageRecorder EC監視機能強化計画

## 概要

PageRecorderにAutoCartAgentのEC監視UI機能を移植し、ec-sites.json定義サイトの監視設定を効率化する。

## 背景

- PageRecorderは「在庫監視と外部拡張への通知」を担当
- URL判明系のECサイト監視も行うため、ec-sites.json連携が必要
- 現状はセレクタ・キーワードを手動入力する必要があり、手間がかかる

## 実装範囲

### 追加する機能

| 機能                      | 説明                                                 |
| ------------------------- | ---------------------------------------------------- |
| サイト選択UI              | ec-sites.jsonに基づくサイト一覧表示                  |
| サイト別監視ON/OFF        | トグルスイッチでサイト単位の有効/無効切替            |
| セレクタ自動付与          | 単一サイトON時にec-sites.jsonから自動補完            |
| URL登録（サイト選択から） | サイト選択ドロップダウン + URL入力でサイト紐づけ登録 |

### 移植しない機能

| 機能         | 理由                                            |
| ------------ | ----------------------------------------------- |
| 認証情報管理 | PageRecorderの責務外（ログイン/購入を行わない） |

## 設計方針

### 1. 既存UIとの統合

PageRecorderの既存「単一URL監視」「複数URL監視」モードを維持しつつ、ec-sites.json連携機能を追加。

```
現状:
  [単一URL監視] [複数URL監視]
    └─ 手動でセレクタ・キーワード入力

変更後:
  [単一URL監視] [複数URL監視]
    └─ 🔍 監視設定
        ├─ サイト選択（ec-sites.jsonベース）← 新規
        ├─ セレクタ（自動補完対応）← 強化
        └─ キーワード（自動補完対応）← 強化
    └─ 🔗 監視URL
        └─ サイト選択からURL登録 ← 新規
```

### 2. ec-sites.json連携

AutoCartAgentの実装を流用：

```javascript
// 既存のconfig-loader.jsを使用
async function loadEcSitesConfig() {
  ecSitesConfig = await loadConfigFromModule();
}

// サイトトグル動的生成
function renderSiteToggles() {
  const container = document.getElementById("siteToggles");
  container.innerHTML = getSiteIds()
    .map((siteId) => `...`)
    .join("");
}

// セレクタ自動補完
function autoFillMonitorSettings(siteId) {
  const config = getSiteConfig(siteId);
  // selectors.productPage.inStock / inStockText を取得
}
```

### 3. サイト選択からのURL登録

AutoCartAgentの「監視URL」セクションを移植：

```html
<div class="section">
  <div class="section-title">🔗 監視URL</div>
  <select id="urlSiteSelect">
    <option value="">サイトを選択...</option>
    <!-- ec-sites.jsonから動的生成 -->
  </select>
  <input type="text" id="urlInput" placeholder="https://..." />
  <button id="addUrlBtn">追加</button>
  <div id="urlList"><!-- 登録済みURL一覧 --></div>
</div>
```

## 変更対象ファイル

| ファイル         | 変更内容                                         |
| ---------------- | ------------------------------------------------ |
| `src/popup.html` | サイト選択UI、監視URL登録セクション追加          |
| `src/popup.js`   | ec-sites.json読込、セレクタ自動補完、URL登録処理 |
| `src/popup.css`  | サイトトグル、URL登録のスタイル                  |
| `manifest.json`  | 必要に応じてweb_accessible_resources追加         |

## 実装ステップ

### Phase 1: ec-sites.json連携基盤

1. config-loader.js（または同等機能）をPageRecorderに追加
2. popup.jsでec-sites.json読込処理を実装
3. サイト一覧取得・サイト設定取得のヘルパー関数を実装

### Phase 2: サイト選択UI

1. popup.htmlにサイトトグルセクションを追加
2. popup.jsでサイトトグルの動的生成を実装
3. サイトON/OFF状態のstorage保存を実装

### Phase 3: セレクタ・キーワード自動補完

1. 単一サイトON検出ロジックを実装
2. autoFillMonitorSettings()相当の関数を実装
3. 既存のセレクタ・キーワード入力欄への自動入力を実装

### Phase 4: URL登録（サイト選択から）

1. popup.htmlに監視URLセクションを追加
2. サイト選択ドロップダウン + URL入力フォームを実装
3. 登録済みURL一覧表示・削除機能を実装

### Phase 5: テスト・検証

1. ec-sites.json定義の各サイトでセレクタ自動補完を確認
2. URL登録・削除の動作確認
3. 既存機能（単一URL監視、複数URL監視、定時監視）との共存確認

## 検証方法

1. **セレクタ自動補完テスト**
   - 単一サイト（例：Joshin）をON
   - 監視設定のセレクタ・キーワードが自動入力されることを確認

2. **URL登録テスト**
   - サイト選択から「日産オンラインショップ」を選択
   - URLを入力して「追加」
   - 一覧に登録され、削除も可能なことを確認

3. **既存機能との共存テスト**
   - 既存の「アクティブタブ選択」が引き続き動作すること
   - 複数URL監視モードのExcel出力/取込が動作すること

## リスク・注意点

1. **popup.jsが1800行超**
   - 既存ロジックとの競合に注意
   - 段階的に機能追加し、各ステップで動作確認

2. **ec-sites.json同期**
   - shared/ec-sites-master.jsonが正本
   - PageRecorder側はsync-ec-sites.jsで同期された配布用コピーを使用

3. **UIの一貫性**
   - AutoCartAgentのデザインパターン（トグルスイッチ等）を踏襲
   - 既存PageRecorder UIとの違和感を最小化

---

作成日: 2026-08-25
