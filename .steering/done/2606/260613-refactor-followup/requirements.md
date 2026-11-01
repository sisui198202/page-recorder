# Requirements: リファクタリング第2弾（仕上げ）

## 目的

第1弾リファクタリング完了後のコードベースをレビューし、検出された残課題・潜在バグを是正する。
「第1弾の仕上げと正直な状態の回復」が目的であり、新機能追加や構造整理の続きではない。

## 背景

- 第1弾リファクタリング（Phase 0〜7）が完了
- レビューで以下の残課題が検出された：
  - tasklist と実態の不一致（Phase 4 未実施問題）
  - テスト基盤の潜在バグ・依存不整合
  - テスト補助の過剰設計
  - 未使用 devDependency

## 是正対象（Debt Map）

| ID | 項目 | 状態 |
|----|------|------|
| F1 | tasklist と実態の不一致 | ✅ 実施（Q1回答済み） |
| F2 | tests/setup.js の jest-chrome 誤用 | ✅ 実施 |
| F3 | jest 29 × jest-environment-jsdom 30 版数不整合 | ✅ 実施（Q3→node採用） |
| F4 | scheduled-watch-sites.json テスト時刻 | ⏭️ スキップ（Q2→問題無し） |
| F5 | load-source-functions.js 過剰設計 | ✅ 実施 |
| F6 | 未使用 devDependency js-yaml | ✅ 実施 |
| F7 | ログ整理（旧 Phase 4） | ✅ 実施（Q1回答済み） |
| F8 | generateFilename 配置問題 | ❌ 提案のみ |
| F9 | onMessage 巨大 case 残り | ❌ 提案のみ |

## 受け入れ条件

- [ ] 全テストが green（件数不変）
- [ ] テスト基盤の潜在バグが解消されている
- [ ] テスト補助が簡素化されている
- [ ] tasklist の記載が実態と一致している
- [ ] ログ整理が完了している（Phase 5）
- [ ] 未使用 devDependency が削除されている

## 制約

- manifest.json は変更しない
- storage キー・通知契約は変更しない
- scheduled-watch-sites.json のスキーマは変更しない
- テストの期待値を書き換えて通すことは禁止
- 本書に記載のない削除・抽出・統合を行わない

## 参照

- `plan/refactor-instructions1.md`（詳細指示書）
- `plan/docs/refactor-instructions.md`（第1弾指示書）
