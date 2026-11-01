# tasks — claude-codex-rule-sync

## Phase 1: 確認

- [x] 人間側正本、Claude正本、両グローバル指示、Codex入口の現状を確認する。
- [x] 今回の改善がRuleの判断基準であり、新規Skillや個別Codex入口の変更を要しないことを確認する。

## Phase 2: 更新

- [x] 人間側正本とClaude正本へ、正本選定・共通挙動・Codex入口の判断フローを追加する。
- [x] Claude/Codexグローバル指示へ短い共通フックを追加する。
- [x] Codex入口を最小導線のまま補足する。

## Phase 3: 検証

- [x] 5ファイルの差分と参照先を確認する。
- [x] 個別Codex rules／skillsを変更していないことを確認する。
