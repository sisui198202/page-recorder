# AI Notes

## 現在の実行状況

- タスク名: Excel取込のファイル選択ダイアログ不表示修正
- 更新日: 2026-09-08
- 最後に更新したAI: Codex
- 状態: 完了
- 現在フェーズ: 完了整理
- 今回の主目的: Chrome popup から Excel/CSV のファイル選択を確実に起動する
- 次にやること: `.steering/done/2609/` の完了記録を参照する

## 実装メモ

- Chrome for Testing 136でlabel方式とFile System Access API優先方式が解決しなかったため、ボタンクリック内から同期的に非表示native file inputを起動する既存方式へ復帰する。
- native file inputの `change` は既存の共通取込関数へ渡し、未選択時は取込処理を呼ばずinput値だけをリセットする。
- 2026-09-08: Jest 5 suites / 130 tests、`npm run check:plan-todo`、`git diff --check` が成功した。

## 手動テストの失敗記録（ユーザー承認済み）

2026-09-07、Chrome for Testing 136で、非表示・透明なfile inputではExcel取込のファイル選択ダイアログが開かなかった。その後のlabel方式とFile System Access API優先方式でもダイアログを開けなかったため、以前動作していた同期native input方式へ復帰する。

## 手動テスト報告メモ

2026-09-08: CfT 136の新規BプロファイルではExcel取込が成功し、その後Aプロファイルでも成功した。CfTや拡張実装の恒久的制約ではなく、Aの一時的なブラウザ／プロファイル状態と判定した。
