# requirements — start-all-monitoring-handler

## 目的

`startAllMonitoring` の message case 本体を、同一ファイル内の名前付き async handler に抽出し、現在の複数 URL 監視開始契約を変えずに可読性と単体テスト可能性を高める。

## 背景

`src/background/background.js` の `onMessage` switch に複数 URL 監視開始の一連処理が残っている。既存の `quickCapture` などと同様に handler へ抽出する。

## 要件

- action 名 `startAllMonitoring`、request / response 形式、非同期応答の扱いを維持する。
- 設定検証、`monitoring_config` 保存、個別開始、結果集計、既存ログの内容と順序を維持する。
- 設定なし、設定保存失敗、全件成功、部分成功の応答契約を Jest で固定する。

## 受け入れ条件

- switch の `startAllMonitoring` case は handler 呼出しだけである。
- 全自動テスト、`npm run check:plan-todo`、`git diff --check` が成功する。
- Chrome で複数 URL 監視の「全て開始」を実行し、開始結果表示と設定保持を確認できる。

## スコープ外

- `startMonitoring` の抽出
- 系統 A/B/C の統合、`content.js` 廃止、系統 A の alarms 移行
- `tests/memo.md` の変更

## 起点

- ユーザー承認済み実装計画「startAllMonitoring handler抽出」
- `plan/docs/start-all-monitoring-handler-extraction.md`
