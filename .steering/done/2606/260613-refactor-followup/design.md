# Design: リファクタリング第2弾（仕上げ）

## 設計方針

- 各 Phase = 独立コミット（revert 可能）
- 無関係な整形・リネーム・「ついで」の修正をしない
- テストを通すために本体の挙動を変えない

## 変更対象ファイル

| Phase | ファイル |
|-------|---------|
| 1 | `tests/setup.js`, `package.json`, `package-lock.json` |
| 2 | `tests/helpers/load-source-functions.js` |
| 3 | なし（確認のみ） |
| 4 | `.steering/*/tasklist.md`, `plan/docs/refactor-proposals.md` |
| 5 | `src/background/background.js` |

## Phase 別設計

### Phase 0: 現状記録
- Baseline Commands 実行
- `plan/refactor-baseline-2.md` に記録

### Phase 1: テスト基盤の是正
1. `tests/setup.js`: `const { chrome } = require('jest-chrome');` 方式へ修正
2. `package.json`: `testEnvironment` を `"node"` へ変更
3. `jest-environment-jsdom` を devDependencies から削除
4. `js-yaml` を devDependencies から削除

### Phase 2: テスト補助の簡素化
1. `loadBackgroundFunctions`: stock-helpers.js 全文を1回 vm.runInContext
2. `backgroundDependencies` / `collectDependencies` / 不要な正規表現抽出を削除
3. `loadContentFunctions`（brace 抽出）は維持
4. API シグネチャは不変

### Phase 3: 設定値の確認
- Q2 回答により是正不要
- 現状値を確認・記録のみ

### Phase 4: 記録の是正
1. 第1弾 tasklist を実態に合わせて修正
2. `plan/docs/refactor-proposals.md` へ F8, F9 を追記

### Phase 5: ログ整理
1. 対象: `🔵 [DEBUG]`、`🔍 [...]` 等のトレース系
2. `logger.debug` へ置換（メッセージ文字列は不変）
3. 30箇所/コミット以内で分割
4. `shouldSuppressLog` との干渉チェック必須

### Phase 6: 仕上げ
- 全 Phase の検証結果を整理
- 最終報告を作成

## 検証方法

- 各 Phase 末: `npm test`（件数つき）、`git diff --stat`
- Phase 1〜2: テスト件数と合否が Phase 0 と完全一致
- Phase 5: SW コンソール確認（不可なら手順提示）
