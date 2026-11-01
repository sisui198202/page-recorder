# requirements — extract-message-handlers

## 目的

`background.js` のメッセージ処理から、即座取得と設定の CSV 入出力を名前付き関数へ抽出し、将来の局所修正を安全にする。

## 背景

`plan/docs/refactor-proposals.md` の提案6で、`quickCapture`、`exportMonitoringSettings`、`importMonitoringSettings` は挙動を変えずに分離できる候補とされている。現在は `onMessage` の switch 内に実装があり、個別の応答契約を検証しにくい。

## 機能要件

- 3 action の成功・入力不足・依存 API 失敗時の応答を自動テストで固定する。
- 3 action の実装を同一ファイル内の名前付き handler へ移す。
- action 名、request/response 形式、storage、ダウンロード、ログ、および非同期応答の扱いを変えない。

## 受け入れ条件

- `quickCapture`、`exportMonitoringSettings`、`importMonitoringSettings` の switch case が handler 呼出しだけになる。
- 各 handler の成功・失敗応答を Jest で確認できる。
- 即座取得、CSV export、CSV import を Chrome で各1回確認できる。
- 系統A/B/Cの監視仕様と既存 storage キーを変更しない。

## スコープ外

- 系統B/C統合、系統Aの alarms 移行、content script 廃止。
- storage スキーマ、popup UI、ログ仕様、外部通知の変更。

## 起点と承認

- 起点: `plan/docs/refactor-proposals.md` の提案6。
- ユーザーは、系統A/Bを継続利用する前提で本小規模整理の実装を承認済み。
