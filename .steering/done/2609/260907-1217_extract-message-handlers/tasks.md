# tasks — extract-message-handlers

## Phase 1: 特性テスト

- [x] `quickCapture` の成功時・Chrome API 失敗時の応答と保存呼出しをテストする。
- [x] `exportMonitoringSettings` の成功時・export 失敗時の応答とダウンロードをテストする。
- [x] `importMonitoringSettings` の入力不足・成功・import 失敗時の応答をテストする。

## Phase 2: handler 抽出

- [x] 3 action の処理本体を同一ファイル内の名前付き async handler へ移す。
- [x] 各 switch case を handler 呼出しだけにし、action 名・応答形式・`return true` の扱いを維持する。
- [x] Phase 1 のテストを通し、実装と確認が完了した項目を更新する。

## Phase 3: Chrome 手動確認

- [x] popup から即座取得を実行し、PNG と HTML の保存、成功表示を確認する。
- [x] 設定の CSV export を実行し、ダウンロードと成功表示を確認する。
- [x] CSV import を実行し、設定反映と成功表示を確認する。

## Phase 4: 仕上げ

- [x] 関連 Jest、`npm run check:plan-todo`、`git diff --check` を実行する。
- [x] `ai-notes.md`・`decisions.md` の更新要否を確認する。
- [x] 系統A/B/C、storage、popup、manifest に変更がないことを確認する。

## 保留

- [-] 系統B/C統合、content script 廃止、系統Aの alarms 移行は今回対象外。理由は `plan/docs/refactor-proposals.md` と `decisions.md` を参照。
