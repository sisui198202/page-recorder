# design — AEON 定時 監視ウィンドウ

## 設定（single_config.settings）

| キー | 型 | デフォルト | 備考 |
|------|-----|-----------|------|
| scheduleEnabled | boolean | false | 既存 |
| scheduleWindowStart | string | `11:57` | `scheduleTime` から移行 |
| scheduleWindowEnd | string | `12:05` | 新規 |
| scheduleReloadIntervalSec | number | 30 | 5〜300 |
| scheduleTime | string | — | 後方互換。読込時 Start へフォールバック |

## アラーム

| 名前 | 用途 |
|------|------|
| `dailyStockCheck` | 毎日 `scheduleWindowStart` に1回 → セッション開始 |
| `stockWatchTick` | セッション中のポーリング（再スケジュール） |

## セッション storage

`scheduledStockWatchSession`:

```json
{
  "active": true,
  "phase": "active",
  "comparisonKey": "...",
  "targetUrl": "...",
  "inspectionTabId": 123,
  "windowEndMs": 0,
  "baselineUrls": [],
  "baselineCount": 0,
  "reloadIntervalSec": 30,
  "settings": { "notifyExternalExtension": true, ... }
}
```

## フロー

```mermaid
sequenceDiagram
  participant Alarm as dailyStockCheck
  participant SW as background
  participant Tab as 一覧タブ
  Alarm->>SW: 開始
  SW->>SW: baseline = snapshots[key], session phase=starting を即保存
  SW->>Tab: 開く（1枚のみ。二重開始は in-flight + active で拒否）
  loop stockWatchTick until 終了 or 検知
    SW->>Tab: snapshot
  alt newUrlsあり
    SW->>SW: 通知・snapshot更新
  else 未検知かつ時間内
    SW->>Tab: reload
  end
```

## 変更ファイル

- `src/background/background.js`
- `src/background/monitoringConfigManager.js`
- `src/ui/popup.html`
- `src/ui/popup.js`
- `tests/aeon-scheduled-stock-check-sw-manual.md`（追記）
