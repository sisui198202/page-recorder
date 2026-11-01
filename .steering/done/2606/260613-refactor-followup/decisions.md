# Decisions

## 2026-06-12: Q1〜Q3 回答

### Q1: ログ整理を実施するか
**回答: (a) 実施する**
→ Phase 5 を実行する

### Q2: scheduled-watch-sites.json の時刻設定
**回答: 問題無し**
→ 現状の設定値で運用上問題ない。Phase 3 での是正は不要

### Q3: testEnvironment を node へ変更
**回答: ベストプラクティスで実施**
→ testEnvironment を `"node"` へ変更し、jest-environment-jsdom を削除する
