# design — start-all-monitoring-handler

## 方針

`src/background/background.js` に `async function handleStartAllMonitoringMessage(request, sendResponse)` を追加する。現在の `case "startAllMonitoring"` 本体を、そのままこの関数へ移す。switch 側は `await handleStartAllMonitoringMessage(request, sendResponse);` と `break` のみとする。

## 変更しない契約

- 成功時は `success`、`message`、`results`、`successCount`、`failureCount`、`requestId` を返す。
- 失敗時は `success: false`、`error`、既存の失敗メッセージを返す。
- `resolveStartAllMonitoringRequestMeta`、`buildPersistedConfigForStartAllMonitoring`、`runMultipleMonitoringStartConfigs`、`summarizeStartAllMonitoringResults` の利用順と引数を変えない。
- `onMessage` listener 末尾の `return true` を維持する。

## テスト設計

handler をテスト可能な形で source loader に読み込み、依存関数をテスト内で stub する。各ケースで `sendResponse`、設定保存、個別開始呼出しを検証する。

| ケース | 期待結果 |
| --- | --- |
| 設定なし | 保存・開始を行わず、既存の失敗 response |
| 設定保存失敗 | 個別開始を行わず、既存の失敗 response |
| 全件成功 | 保存後に全件開始し、成功件数と response を返す |
| 部分成功 | 保存後に全件開始し、成功・失敗件数を含む response を返す |

## 変更対象

- `src/background/background.js`
- `tests/unit/background-functions.test.js`

変更しない: popup、manifest、storage schema、外部通知 payload、`tests/memo.md`。
