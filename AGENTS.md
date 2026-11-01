# AGENTS.md

`PageRecorder` で作業する際の差分ルールです。共通方針は親の `chromeExtensions/AGENTS.md` を優先して参照してください。

## この拡張のフロー

- タスク管理は `/newtask` と `.steering/` を使う
- 判断順序は `PRD > steering > code`
- 実装は `tasks.md` にある Phase 単位で進める
- `.steering/<task>/` の標準文書は `requirements.md` `design.md` `tasks.md` `ai-notes.md` を前提とする
- 参照優先順位は `requirements.md > design.md > tasks.md > ai-notes.md` とし、`ai-notes.md` は仕様正本ではなく実務知見メモとして扱う
- タスク要件の Git 権限は「実装・検証フェーズ」と「完了処理フェーズ」に分ける。前者では commit / push / branch削除 / アーカイブを行わず、後者はユーザーが完了処理を明示承認した場合だけ行う。恒久的な禁止として記録しない。

## 作業前に見るもの

- `PRD/`
- `plan/todo.md`
- `tests/` と既存の検証メモ
- `.steering/README.md` と対象 task の `ai-notes.md`（存在する場合）
- フロー理解が必要な変更では `docs/mermeid/README.md`
- ログ出力を変更する場合は `rules/logging.md` と `docs/ログ表記ガイド.md`

## この拡張で特に注意すること

- 監視ロジック、background I/O、外部拡張への通知境界を崩さない
- `background` の新規ログは原則 `logger` / `bgLog*` 経由とし、生 `console.*` の追加は避ける
- `〇〇とは` 形式の用語説明をした場合は、回答後に `PRD/glossary.md` への追記要否を確認する
- 完了済みの計画やメモは `docs/実装済/` と `.steering/done/` の両方を見て重複を避ける
- 実装後は手動テスト観点を残し、必要なら `tests/docs/` を更新する
- `decisions.md` には判断理由、`ai-notes.md` には実務知見、`done.md` には完了要約を残し、責務を混ぜない
- `ai-notes.md` の更新は回数基準ではなくイベント基準とし、重要判断、不採用確定、ユーザーの手動テスト成功/失敗報告、`/task-close` 前の引き継ぎ整理で追記要否を確認する
- 受け入れ条件に関わるChrome手動確認の成功/失敗報告では、`ai-notes.md` への1〜4行の要約追記案を必ず提示する（生ログ全文は保存しない）
- `task-close` では `ai-notes.md` の更新要否を確認し、必要な内容を含めたまま `.steering/done/` へ保持する
- `plan/docs/` を起点にした task は、実装・必要なテスト・`.steering/done/` への完了記録がそろったら、対応計画書を必ず `docs/実装済/` へ移す。未完了項目が混在する場合は完了部分を分離し、未完了部分だけを残す
- 確認済みのリポジトリ運用ルール違反を検知・指摘された場合は、依頼範囲内の成果物を直ちに修正し、再発防止の判断基準を最も近い repo 内ルールへ自動で追記・修正してから検証する。既存のユーザー変更であっても、ルールが要求する整理の免除理由にはしない
- ルール更新が共有ルール・外部ファイル・仕様変更まで及ぶ場合だけ、対象と根拠を示してユーザー判断を求める
