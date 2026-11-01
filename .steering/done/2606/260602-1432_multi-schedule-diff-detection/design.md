# Design: 定時差分検知の複数設定対応

## 設計方針

既存の `monitoring_config` 構造を拡張し、`scheduled_watch_sites` という新しい設定配列を追加する。

## データ構造設計

### 1. JSON設定ファイル（新規）

`src/config/scheduled-watch-sites.json`:

```json
{
  "version": "1.0.0",
  "sites": [
    {
      "id": "aeon-pokemon",
      "name": "AEON ポケモンカード",
      "enabled": true,
      "url": "https://aeonretail.com/Form/Product/ProductList.aspx?gspsk=...",
      "selectors": {
        "productLinks": "a[href*='/product/0/P-']",
        "itemCount": ".item-count"
      },
      "schedule": {
        "startTime": "11:57",
        "endTime": "15:15",
        "intervalSeconds": 60
      },
      "notification": {
        "openProductUrl": true,
        "notifyOtherExtensions": true,
        "siteId": "aeon"
      }
    },
    {
      "id": "aeon-onepiece",
      "name": "AEON ワンピースカード",
      "enabled": false,
      "url": "https://aeonretail.com/Form/Product/ProductList.aspx?gspsk=...",
      "selectors": {
        "productLinks": "a[href*='/product/0/P-']"
      },
      "schedule": {
        "startTime": "11:57",
        "endTime": "15:15",
        "intervalSeconds": 60
      },
      "notification": {
        "openProductUrl": true,
        "notifyOtherExtensions": true,
        "siteId": "aeon"
      }
    }
  ]
}
```

### 2. chrome.storage.local 拡張

```javascript
{
  // 既存
  monitoring_config: { ... },
  scheduledStockSnapshots: { ... },

  // 新規：複数サイト監視セッション
  scheduledWatchSessions: {
    "aeon-pokemon": {
      active: boolean,
      phase: "idle" | "starting" | "active",
      inspectionTabId: number,
      windowStartMs: number,
      windowEndMs: number,
      baselineArtifactsSaved: boolean
    },
    "aeon-onepiece": { ... }
  },

  // 新規：サイト別スナップショット
  // 既存の scheduledStockSnapshots をサイトID単位で管理
}
```

## 変更対象ファイル

### 新規作成

1. `src/config/scheduled-watch-sites.json` - サイト設定ファイル
2. `src/scheduled-watch-manager.js` - 複数サイト監視管理モジュール

### 変更

1. `src/background.js` - 複数サイト監視のアラーム管理
2. `src/popup.js` - 設定UI（任意）
3. `src/popup.html` - 設定UI（任意）

## 処理フロー

### 起動時

```
background.js 起動
    ↓
scheduled-watch-sites.json 読み込み
    ↓
enabled=true のサイトを抽出
    ↓
各サイトに対して dailyStockCheck_{siteId} アラーム設定
```

### 定時開始時

```
dailyStockCheck_{siteId} 発火
    ↓
該当サイトの設定を取得
    ↓
監視ウィンドウ開始（既存ロジック流用）
    ↓
stockWatchTick_{siteId} アラーム設定
```

### 監視中

```
stockWatchTick_{siteId} 発火
    ↓
該当サイトのタブをリロード
    ↓
DOM取得・差分検知
    ↓
検知時: 通知・セッション終了
未検知: 次回アラーム待ち
```

## アラーム命名規則

- 開始用: `dailyStockCheck_{siteId}` (例: `dailyStockCheck_aeon-pokemon`)
- 監視用: `stockWatchTick_{siteId}` (例: `stockWatchTick_aeon-pokemon`)

## 後方互換性

- 既存の `dailyStockCheck` / `stockWatchTick` アラームは維持
- 既存の popup 設定（単一URL）での動作を保持
- JSON設定が存在しない場合は、既存動作のみ実行

## 実装フェーズ

### Phase 1: 基盤

- JSON設定ファイル作成
- 設定読み込み処理

### Phase 2: 複数アラーム

- サイト別アラーム設定
- アラームハンドラ分岐

### Phase 3: 監視処理

- 既存の監視ロジックをサイトID対応に拡張
- セッション管理の複数化

### Phase 4: 動作確認

- 複数サイト同時監視テスト
- 既存機能の回帰確認
