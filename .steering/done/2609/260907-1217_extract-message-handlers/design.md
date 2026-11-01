# design — extract-message-handlers

## 方針

`src/background/background.js` 内に、次の async handler を追加する。

- `handleQuickCaptureMessage(request, sendResponse)`
- `handleExportMonitoringSettingsMessage(sendResponse)`
- `handleImportMonitoringSettingsMessage(request, sendResponse)`

各 handler は、既存 switch case の本体をそのまま移す。既存の module-scope 依存（`configManager`、`chrome`、`downloadWithFilename`、logger 群など）は引き続き参照し、依存注入・共有ファイル化・public API の追加はしない。

`onMessage` の各 case は対応 handler を `await` して `break` する。リスナー末尾の `return true` は維持し、popup からの非同期 `sendResponse` 契約を保持する。

## テスト方針

`tests/unit/background-functions.test.js` で source-function loader を使い、handler ごとに Chrome API・configManager・保存 helper をモックする。

- 即座取得: 成功時に PNG/HTML の2保存と既存成功応答、tabs/scripting 失敗時の既存エラー応答。
- export: configManager 成功時の CSV ダウンロードと成功応答、export 失敗時のエラー応答。
- import: `file_data` または `filename` 不足時の既存エラー応答、import 成功時と失敗時の既存応答。

テストは抽出前に追加し、抽出後も同じ期待値を通す。handler の入出力形式は変更しない。

## 変更対象

- 修正: `src/background/background.js`
- 修正: `tests/unit/background-functions.test.js`
- 必要時更新: `tests/docs/README.md`（手動確認導線に差分がある場合のみ）

## 非変更確認

- manifest、content script、popup、storage キー、監視ロジック、外部通知は変更しない。
