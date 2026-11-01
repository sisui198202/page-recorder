# .steering README

`PageRecorder` の task 実行文書は `.steering/` を正本とし、各 task では次の文書を標準構成として扱います。

- `requirements.md`
- `design.md`
- `tasks.md`
- `ai-notes.md`
- 必要に応じて `decisions.md` `blockers.md` `done.md`

## 参照優先順位

`requirements.md > design.md > tasks.md > ai-notes.md`

- `requirements.md`: 何を満たすか
- `design.md`: どう実装するか
- `tasks.md`: 今どこまで進んだか
- `ai-notes.md`: 実装中に得た実務知見、手動テスト報告、close 前引き継ぎ

`ai-notes.md` は仕様の正本ではありません。仕様変更や判断理由の確定は `requirements.md` `design.md` `decisions.md` 側で扱います。

手動テストの記録粒度と同一ターン同期は、`~/.claude/rules/01_development/tasklist-operation-rule.md` を正本とします。

## 責務分離

- `decisions.md`: 判断理由、採用/不採用の理由、比較した選択肢
- `ai-notes.md`: 再利用したい実務知見、重要な実装メモ、ユーザーからの手動テスト成功/失敗報告、close 前引き継ぎ
- `done.md`: 完了要約、確認結果、残課題、完了時点の記録
- `blockers.md`: 実行停止要因と保留理由

## 最小テンプレート

```md
# ai-notes

## 追加した知見

## 不採用と理由

## 手動テスト連携メモ

## close 前引き継ぎ
```

## close 前確認

- `ai-notes.md` に追記すべき新規知見が残っていないか確認する
- 手動テスト記録がグローバル Rule に従って同期済みか確認する
- 受け入れ条件に関わるChrome手動確認について、要約追記案の提示とユーザー承認の有無を確認する
- `.steering/done/` へ移すときは `ai-notes.md` も task 文書セットとして保持する
