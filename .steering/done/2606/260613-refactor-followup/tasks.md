# Tasklist: リファクタリング第2弾（仕上げ）

> 具体化済み: 2026-06-13
> ベースライン: 2 suites / 16 tests / console.log 181箇所
> **完了: 2026-06-13**

---

## Phase 0: 現状記録

### 実装
- [x] `git status` / `git log --oneline -5` 確認
- [x] Baseline Commands 実行:
  - `node --version && npm --version`
  - `npm test 2>&1 | tail -15`（スイート数・テスト件数を記録）
  - `grep -c "console.log" src/background/background.js`
- [x] `plan/refactor-baseline-2.md` に結果を記録

### 検証
- [x] npm test: 2 suites / 16 tests / green
- [x] console.log: 181箇所

### コミット
なし（記録のみ）

---

## Phase 1: テスト基盤の是正（F2, F3, F6）

### 実装
- [x] `tests/setup.js` 修正:
  - `const chrome = require('jest-chrome');` → `const { chrome } = require('jest-chrome');`
- [x] DOM 依存確認: `grep -E "document\.|window\.|jsdom" tests/unit/*.test.js`（確認済み: なし）
- [x] `package.json` 修正:
  - `testEnvironment: "jsdom"` → `testEnvironment: "node"`
  - `jest-environment-jsdom` を devDependencies から削除
- [x] `js-yaml` 無参照確認: `grep -r "js-yaml\|require.*yaml" src/ tests/`
- [x] `js-yaml` を devDependencies から削除
- [x] `npm install` 実行

### 検証
- [x] npm test: 2 suites / 16 tests / green
- [x] テスト件数が Phase 0 と一致

### コミット
```
fix: correct jest-chrome import and remove unused dependencies
```
→ fce41ef

---

## Phase 2: テスト補助の簡素化（F5）

### 実装
- [x] `tests/helpers/load-source-functions.js` 書き換え:
  - `loadBackgroundFunctions`: stock-helpers.js 全文を1回 `vm.runInContext`
  - `backgroundDependencies` / `collectDependencies` 削除
  - `extractFunctionSource`（境界regex版）削除
  - `extractFunctionSourceByBraces` は維持（content.js 用）
- [x] API シグネチャ維持: `loadBackgroundFunctions(functionNames, extraContext)` 不変

### 検証
- [x] npm test: 2 suites / 16 tests / green
- [x] テスト件数・合否が Phase 0 と完全一致
- [x] 差異があれば Stop And Ask

### コミット
```
refactor: simplify loadBackgroundFunctions to load entire stock-helpers.js
```
→ 357fe22

---

## Phase 3: 設定値の確認（F4）— スキップ

> Q2 回答により是正不要。確認のみ。

### 実装
- [x] `src/config/scheduled-watch-sites.json` の現在値を確認・記録:
  - aeon-pokemon: baselineTime, schedules
  - toysrus-pokemon: baselineTime, schedules

### 検証
- [x] JSON が valid: `node -e "require('./src/config/scheduled-watch-sites.json')"`
- [x] `scripts/set-test-times.js` がエラーなく読める: `node -c scripts/set-test-times.js`

### コミット
なし（確認のみ）

---

## Phase 4: 記録の是正（F1, F9）

### 実装
- [x] 第1弾 steering の tasklist 特定:
  - `.steering/20260612-refactor-instructions/tasklist.md` を確認
- [x] tasklist を実態に合わせて修正:
  - Phase 4（ログ整理）: 未実施であることを明記
  - Phase 5 ②: 部分実施（残ケース一覧つき）
- [x] `plan/docs/refactor-proposals.md` へ追記:
  - F8: generateFilename 配置問題（提案2案）
  - F9: 残 case 一覧（startMonitoring, startAllMonitoring, quickCapture, exportMonitoringSettings, importMonitoringSettings）

### 検証
- [x] 文書 diff のみ（コード変更ゼロ）
- [x] src/ 配下に変更なし

### コミット
```
docs: correct tasklist status to match actual implementation
```
→ f218ece

---

## Phase 5: ログ整理（F7）

### 事前確認
- [x] `shouldSuppressLog` の抑制対象文字列を確認
- [x] 置換対象との干渉チェック

### 実装（30箇所/コミット以内）
- [x] 対象パターン特定:
  - `🔵 [DEBUG]` 系
  - `🔍 [関数名]` 系（トレース用）
- [x] `console.log` → `logger.debug` へ置換
  - メッセージ文字列は変更しない
  - `console.error` / `console.warn` は触らない
- [x] 複数コミットに分割（30箇所/コミット）

### 検証
- [x] npm test: green
- [x] SW コンソール確認手順を記載（実機確認不可の場合）

### コミット
```
refactor: replace debug console.log with logger.debug (batch 1/2)
refactor: replace debug console.log with logger.debug (batch 2/2)
```
→ 300d8db, 59f2be8

---

## Phase 6: 仕上げ

### 実装
- [x] 全 Phase の検証結果を整理
- [x] テスト件数推移表を作成:
  | Phase | Suites | Tests | Status |
  |-------|--------|-------|--------|
  | 0     | 2      | 16    | green  |
  | 1     | 2      | 16    | green  |
  | 2     | 2      | 16    | green  |
  | 3     | -      | -     | skip   |
  | 4     | 2      | 16    | green  |
  | 5     | 2      | 16    | green  |
  | 6     | 2      | 16    | green  |
- [x] 最終報告を作成（Reporting Format に従う）

### 検証
- [x] 全テストが green
- [x] tasklist の記載が実態と一致

### コミット
→ 02bfc8f, 9cdb0ff

---

## 完了条件

- [x] Phase 0〜6 すべて完了
- [x] npm test: 2 suites / 16 tests / green（件数不変）
- [x] テスト基盤: jest-chrome 正しく import、testEnvironment=node
- [x] テスト補助: loadBackgroundFunctions が全文ロード方式
- [x] 第1弾 tasklist: 実態と一致
- [x] ログ整理: 完了
- [x] 未使用 devDependency: 削除済み
- [x] 最終報告: 作成済み
- [x] 手動テスト: 更新でエラーなし、既存機能動作確認済み
