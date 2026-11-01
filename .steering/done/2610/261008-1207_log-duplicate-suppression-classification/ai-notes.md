# ai-notes

## 現在の実行状況

- タスク名: ログ重複抑止の分類定義
- 更新日: 2026-10-08
- 状態: 受け入れ確認完了
- 現在フェーズ: 実装・自動テスト・手動受け入れ確認完了
- 主目的: 終端・結果ログを保全し、周期進捗・調査詳細だけをコンテキスト別に抑止する。
- 次にやること: task-close 時に完了記録と計画書の整理を行う。

## 先に見るもの

- requirements.md
- `src/background/background.js` の `shouldSuppressLog()` と `bgLog*`
- `.claude/rules/logging.md`
- `docs/ログ表記ガイド.md`
- 先行関係: `ai/multiple-monitoring-information-architecture` ブランチ上の情報設計改善タスク

## 手動テスト連携メモ

- 既存タスクの2 URL同時検知で、停止状態・証跡保存は両方完了する一方、同文言のINFOログが5秒以内に出ると2件目の停止完了ログが抑止された。
- 2026-10-08: `bgLogInfo` / `bgLogDebug` の暗黙抑止を撤去し、`bgLogProgress` / `bgLogDiagnostic` のみが `level + category + event + scope` で5秒間抑止する実装へ変更した。
- 2026-10-08: `npm test -- --runInBand tests/unit/background-functions.test.js` は105件成功した。
- 2026-10-08: Aの2 URL同時検知で、`single_1791432811109_k0il` と `single_1791432816981_2esy` の `🛑 系統Aセッション停止完了` が各1件出力されたため、手動受け入れ確認は成功した。

## 次のAIへの注意点

- このタスクはログ出力の分類と抑止キーのみを対象とし、既存の監視状態遷移や証跡保存の仕様を変えない。
