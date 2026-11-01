# requirements — claude-codex-rule-sync

## 目的

Claude正本を基準としたルール改善時の参照・更新判断を、人間側正本、Claude正本、両グローバル指示、Codex入口で一貫させる。

## 背景

正本にないCodex側rules／skillsを全件走査せず、改善内容に関係する正本だけを選んで確認できる基準が必要である。

## 受け入れ条件

- [ ] Rule／Skillの判定、必要なClaude正本だけの参照、全件走査をしない基準がClaude正本にある。
- [ ] 人間側正本、Claude正本、Claude/Codexグローバル指示、Codex入口が同じ正本へ到達できる。
- [ ] 今回は新規正本・参照先変更がないため、Codex側の個別rules／skillsを追加・更新しない。

## 承認

- [x] ユーザー承認済み（実装指示済み計画）
