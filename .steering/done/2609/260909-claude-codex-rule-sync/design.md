# design — claude-codex-rule-sync

## 方針

詳細な判断フローは人間側正本とClaude正本にのみ置く。Claude/Codexグローバル指示はその正本へ到達する短いフックとし、Codex入口には正本参照・入口配置済み前提だけを記す。

## 変更対象

- `~/Dropbox/Rule/Category/00_共通/00_メタルール/10_Rule対象判定ルール/10_Rule対象判定ルール.md`
- `~/.claude/rules/00_meta/rule-creation-rule.md`
- `~/.claude/CLAUDE.md`
- `~/.codex/AGENTS.md`
- `~/.codex/rules/00_meta/rule-creation-rule.md`

## 非変更範囲

- Codex側個別rules／skillsの全件走査、追加、更新
- 新規Claude正本Rule／Skillの作成
