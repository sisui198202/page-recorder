# Design: 単独URL状態遷移検知と共有通知統合

## 概要

既存の系統A永続セッション（`singleMonitoringSessions`）へキーワード有無の基準状態を保存し、単独URL・複数URL、高頻度・長期監視を同じ遷移判定に統一する。系統B/Cで使用済みの `ChromeNotify` はBackgroundの共通通知関数へ集約し、系統Aにも適用する。

## 設計方針

- 基準状態は既存の `chrome.storage.local` セッションに保存し、Content Scriptのメモリには保持しない。
- 初回正常判定は、即座検知OFFでは通知せず基準化する。ONでは条件一致だけを従来どおり検知する。
- 正常判定ごとに前回のキーワード有無を更新し、出現は `false → true`、消失は `true → false` だけを検知する。
- セレクタ／取得／判定の異常では状態を更新しない。既存の安全停止・再試行の処理は維持する。
- Chrome通知は失敗をWARN記録するだけで、保存・Gmail・外部拡張通知の処理を止めない。

## 要件マッピング

| 要件 | 対応方法 |
| --- | --- |
| 初回基準・遷移だけの検知 | セッション状態と純粋な遷移判定ヘルパーを追加し、`evaluateSingleMonitoringSession` に適用する。 |
| 即座検知 | 初回状態保存後、ON時だけ現在の条件一致を検知として扱う。 |
| 異常時・Service Worker再開 | 異常結果で状態を書き換えず、既存の `singleMonitoringSessions` 永続化／復元を利用する。 |
| Chrome通知の集約と耐障害性 | `showInventoryDetectionNotification(event)` を追加し、Aのキーワード検知とC差分通知をここから表示する。 |
| 専用テスト導線 | A: single の通知連携に専用シナリオを追加し、外部通知・Gmail・本番baseline更新を無効化する。 |

## 変更内容

### セッションと判定

- `src/background/lib/stock-helpers.js` のセッションに `keywordStateInitialized: false` と `previousKeywordPresent: null` を追加する。
- 同ファイルの純粋ヘルパーが、現在値と保存済み状態から `baseline` / `detected` / `not_detected` を返す。
- `evaluateSingleMonitoringSession()` は正常判定を永続セッションへ保存してから、`detected` 時だけ証跡保存・終了処理へ進む。高頻度・長期ともこの共通経路を使う。

### 通知

- `src/background/background.js` に `showInventoryDetectionNotification(event)` を追加する。キーワード検知は「在庫を検知」、URL差分は現行の「在庫差分を検知」を表示する。
- 系統Aの検知完了フローは保存後、Gmail／外部拡張通知の前に共通関数を1回呼ぶ。
- 既存の系統C差分通知も共通関数を使い、文言、外部通知payload、保存仕様を維持する。

### テストと手順

- `src/ui/popup.html` と `src/ui/popup.js` に、共有Chrome通知専用シナリオを追加する。
- 単体テストで初回ON/OFF、出現、消失、異常後、永続セッション復元後の遷移を固定する。
- `tests/docs/` に、専用シナリオでOS通知と `[chrome-notify] 通知作成成功` を確認する手順を追加する。

## データ構造

```js
{
  keywordStateInitialized: true,
  previousKeywordPresent: false
}
```

既存セッションにこれらがない場合は未初期化として扱い、次の正常判定を初回基準にする。外部API・メッセージpayloadは変更しない。

## 変更対象

- `src/background/lib/stock-helpers.js`、`src/background/background.js`
- `src/ui/popup.html`、`src/ui/popup.js`
- `tests/unit/background-functions.test.js`、`tests/unit/shared-notification-integration.test.js`、関連UI契約テスト
- `tests/docs/` の手動確認手順
