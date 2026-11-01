# tasks — start-all-monitoring-handler

## Phase 1: 事前確認

- [x] 要件・設計・既存の handler と `startAllMonitoring` 実装を確認する。
- [x] request / response、storage、ログの現行契約を確認する。

## Phase 2: 実装

- [x] `handleStartAllMonitoringMessage` を追加し、case 本体を挙動を変えずに移す。
- [x] switch の case を handler 呼出しへ置換する。

## Phase 3: 自動テスト

- [x] 設定なし、保存失敗、全件成功、部分成功の handler 特性テストを追加する。
- [x] Jest 全件と静的チェックを実行する。

## Phase 4: Chrome 手動確認・完了処理

- [x] 複数 URL 監視の「全て開始」で開始結果と設定保持を確認する。
- [x] 手動確認結果を受け、`ai-notes.md` に要約を記録する。
- [x] 計画書を完了済み文書としてアーカイブする。
