# Claude正本を基準にした横断ルール改善

## 目的

ルール改善時に必要なClaude正本だけを選んで参照し、Claude/Codex間の共通挙動とCodex入口の責務を明確にする。

## 方針

- 改善内容を判断基準（Rule）か実行手順（Skill）かで判定する。
- 該当するClaude正本のRule／Skillだけを確認し、全件走査はしない。
- Claude/Codex共通挙動に影響する場合だけ、`~/.claude/CLAUDE.md` と `~/.codex/AGENTS.md` を追記候補として確認する。
- Codex側のrules／skillsは対応入口が配置済みである前提とし、新規正本または参照先変更時だけ入口を確認・更新する。

## 対象

- 人間側正本: `Rule対象判定ルール`
- Claude正本: `~/.claude/rules/00_meta/rule-creation-rule.md`
- Claude/Codexグローバル指示: `~/.claude/CLAUDE.md`、`~/.codex/AGENTS.md`
- Codex入口: `~/.codex/rules/00_meta/rule-creation-rule.md`

## 非対象

- 今回の正本更新に伴わないCodex側個別rules／skillsの走査・変更
- 新規Claude正本Rule／Skillの作成
