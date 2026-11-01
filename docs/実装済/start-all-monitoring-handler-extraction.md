# startAllMonitoring handler抽出計画

## 目的

`startAllMonitoring` の switch case を名前付き async handler に抽出し、複数 URL 監視開始の既存契約を維持したまま保守性とテスト可能性を高める。

## 実施内容

- 同一ファイル内へ `handleStartAllMonitoringMessage(request, sendResponse)` を追加する。
- 設定検証、設定保存、個別開始、集計、成功・失敗 response、ログを挙動変更なしで移す。
- 設定なし、保存失敗、全件成功、部分成功を Jest で検証する。

## 除外事項

- `startMonitoring` の抽出
- 監視系統統合、`content.js` 廃止、alarms 移行
- `tests/memo.md` の変更
