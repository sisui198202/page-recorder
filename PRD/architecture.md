# System Architecture - PageRecorder

## 概要

本ドキュメントでは、`PageRecorder` の全体アーキテクチャ、実行レイヤー、データフロー、MV3 制約への対応を定義する。

---

## 1. 設計原則

- Manifest V3 準拠
- Service Worker ベース
- ローカル完結の保存と設定管理
- 監視ロジック、background I/O、外部拡張通知境界の分離
- 主運用である定時在庫監視フローを優先

## 2. レイヤー構成

```text
Popup UI
  - src/ui/popup.html
  - src/ui/popup.js

Service Worker
  - src/background/background.js

Content Script
  - src/content/content.js

Background Helpers
  - src/background/lib/stock-helpers.js
  - src/background/monitoringConfigManager.js

Bundled Config / Assets
  - src/config/scheduled-watch-sites.json
  - src/config/ec-sites.json
  - src/offscreen/*
```

### 各レイヤーの責務

| レイヤー | 責務 |
| --- | --- |
| Popup UI | 設定編集、状態表示、手動操作、テストタブ操作 |
| Service Worker | 監視制御、アラーム同期、保存処理、外部通知、状態更新 |
| Content Script | レガシー単一監視向けの DOM 状態取得 |
| Helpers | 設定 I/O、差分判定、整形、補助ロジック |
| Bundled Config | サイト定義、スケジュール定義、offscreen 補助 |

---

## 3. 技術スタック

| 技術 | 用途 |
| --- | --- |
| Chrome Extension Manifest V3 | 拡張ランタイム |
| JavaScript | 実装言語 |
| `chrome.storage.local` | 設定・状態保存 |
| `chrome.alarms` | 定時監視 |
| `chrome.scripting` | ページ内取得処理 |
| `chrome.identity` | Gmail API の OAuth 認証 |
| Jest | ユニットテスト |
| `jest-chrome` | Chrome API モック |

手動回帰確認は `tests/docs/` の手順を正本とする。

---

## 4. 主要フロー

### 4.1 popup からの設定反映

```text
popup
  -> 設定入力
  -> chrome.storage.local へ保存
  -> background が設定または状態を再同期
```

### 4.2 定時在庫監視

```text
設定読込
  -> chrome.alarms 作成
  -> アラーム発火
  -> 対象ページ取得
  -> 在庫差分 / URL 差分判定
  -> 保存と external messaging
  -> 状態更新
```

### 4.3 ダウンロード処理

```text
検知イベント
  -> screenshot 取得
  -> HTML / DOM 情報取得
  -> 必要に応じて offscreen 利用
  -> chrome.downloads.download()
```

### 4.4 Fetch監視経路

- 系統Aの高頻度Fetchは、監視タブのContent Scriptが同一URLを取得する。5〜20秒の短周期とページのCookie文脈を維持するため、監視タブを利用する。
- 系統Aの長期Fetchは、`chrome.alarms`で起動し、監視タブのContent Scriptへ取得を依頼する。
- 系統CのFetchは、Service Workerが取得しoffscreenで解析する。通常はタブを作成せず、Fetch失敗時だけDOM監視へフォールバックする。
- 実行履歴、実測間隔、Service Workerログ、AI判断サポート、通知、証跡保存は取得経路をまたいで共通の監査情報として扱う。

経路選択の詳細は [Fetch監視経路の設計ガイド](../docs/Fetch監視経路の設計ガイド.md) を参照する。

---

## 5. MV3 制約への対応

| 制約 | 対応 |
| --- | --- |
| Service Worker は永続でない | `chrome.storage.local` と `chrome.alarms` で状態と再開条件を保持 |
| background から DOM に直接触れない | `chrome.scripting.executeScript()` または content script を使う |
| Blob 処理に補助が要る場合がある | `src/offscreen/` を利用する |
| CSP 制約がある | インライン script や `eval()` を使わない |

---

## 6. 権限と外部境界

### 6.1 manifest 権限

現行の `manifest.json` に基づく。

```json
{
  "host_permissions": ["<all_urls>"],
  "permissions": [
    "notifications",
    "alarms",
    "scripting",
    "downloads",
    "downloads.shelf",
    "tabs",
    "storage",
    "activeTab",
    "offscreen",
    "cookies"
  ]
}
```

### 6.2 外部境界

- 外部サーバーやクラウド API への常時依存は持たない
- ただし、検知結果の出口として外部拡張への messaging 連携を持つ
- 利用者が有効化した場合だけ、Gmail API を検知結果の送信先として利用する
- 通知先最適化や購入実行判断は本拡張の責務外

---

## 7. テストと運用

- 自動テストは Jest ベース
- Chrome 実機の手動確認は `tests/docs/` を参照する
- background の新規ログは `logger` / `bgLog*` を使う
- 実装判断は `PRD > steering > code` の順で行う
