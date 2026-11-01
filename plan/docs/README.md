# plan/docs/ README

## 役割

`plan/docs/` は、未完了の改善計画、将来課題、承認前の提案を管理する場所です。

全体ルールは `plan/README.md` を正本とし、本書は `plan/docs/` 内の起票順・補足運用を定義します。

- 未完了の改善計画
- 将来課題
- 承認前の提案

事実や現状整理の正本は `PRD/` に置き、実行中タスクは `plan/todo.md` と `.steering/` で管理します。

## 接続フロー

`PRD -> plan/docs -> plan/todo.md -> /newtask -> .steering`

- `PRD`: 現状・要件・調査結果
- `plan/docs`: 改善計画や将来課題の整理
- `plan/todo.md`: 今やる候補の明示
- `/newtask`: 実装タスクの起票
- `.steering`: requirements / design / tasks / ai-notes で実装を進める場所

## 補足ルール

- `plan/todo.md` に載っている課題を優先します。
- 原則は `plan/todo.md` を起点にし、未掲載または複数候補で判断材料が必要な場合に `plan/docs/` の優先順と背景説明で補います。
- `plan/todo.md` に複数候補がある場合は、依存関係が強い基盤タスクを先に起票します。
- `plan/docs/` から直接 `/newtask` する場合は、その理由と起点文書を `.steering` の `requirements.md` に残します。
- 起票後の `.steering/<task>/` では `requirements.md > design.md > tasks.md > ai-notes.md` の順で参照します。
- `ai-notes.md` は `plan/docs/` の代わりではなく、実行中 task の実務知見や手動テスト報告をイベント基準で残す補助文書です。
- `plan/docs/` を起点にした task は、実装・必要な自動/手動テスト・`.steering/done/` への完了記録がそろったら、対応計画書を必ず `docs/実装済/` へ移します。未完了項目が混在する場合は完了部分を分離し、未完了部分だけを残します。
