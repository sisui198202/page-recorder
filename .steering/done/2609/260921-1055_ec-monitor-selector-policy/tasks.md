# タスク: EC監視自動反映セレクタ適合化

## 状態

- [x] ユーザー承認済み（2026-09-21）

## Phase 1: 設定契約とPopup

- [x] `pageRecorderMonitor`の優先・従来値フォールバックを共通関数として実装する。
- [x] single自動補完、multiple追加、編集時のサイト同定を共通関数へ接続する。
- [x] Premium Bandaiに`div.cart` / `予約する`を登録し、shared masterから同期する。

## Phase 2: 選定基準と検証

- [x] PageRecorder向けの選定基準を共有スキルとローカル文書へ反映する。
- [x] 専用値優先・フォールバック・Premium Bandaiのユニットテストを追加する。
- [x] JSON検証、対象ユニットテスト、Chrome手動テストを実施する。
