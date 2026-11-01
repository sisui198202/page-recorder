# 完了記録 — claude-codex-rule-sync

## 完了日時

2026-09-09

## 対象タスク

Claude正本を基準に、ルール改善時のRule／Skill判定、必要な正本だけの参照、共通挙動時のグローバル指示確認、Codex入口の扱いを一貫させる。

## Git反映

- 作業ブランチ: `docs/claude-codex-rule-sync`
- merge先: `main`
- 実装コミット: `e3a2aac261b26ac4dd4acb0378f5c0da1560d7fe`
- main反映・push確認: 済み
- 削除したローカルブランチ: `docs/claude-codex-rule-sync`

## 変更概要

- 人間側正本とClaude正本へ、AI運用ルール改善の判断フローを追加した。
- `~/.claude/CLAUDE.md` と `~/.codex/AGENTS.md` に、Claude正本を選定し共通挙動では両グローバル指示を確認する短いフックを追加した。
- Codex入口に、入口配置済みを前提とし、新規正本または正本参照先の変更時だけ確認・更新する方針を追加した。

## 確認結果

- 人間側正本とClaude正本に、Rule／Skill判定・必要な正本だけの参照・全件走査をしない基準があることを確認した。
- Claude/Codexの両グローバル指示からClaude正本 `rule-creation-rule.md` を参照できることを確認した。
- 個別Codex rules／skillsを追加・更新していないことを確認した。
- `git diff --check` と `npm run check:plan-todo` が成功した。

## ドキュメント整理

- 完了した計画書を `docs/実装済/` へ移動した。
- `plan/todo.md` は未着手・進行中項目なしの状態を維持した。

## ルール更新提案

本タスクで実装済み。更新対象は人間側正本、Claude正本、Claude/Codexグローバル指示、Codex入口であり、個別Codex入口の追加・更新は不要と判断した。

## 残課題

なし。
