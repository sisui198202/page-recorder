# 実装済み: PageRecorder リファクタリング第2弾 指示書

> 本書は 2026-06-13 完了の第2弾リファクタリング計画を履歴として保管した実装済み文書である。
> 関連 steering: `.steering/done/2606/260613-refactor-followup/`

> 本書は、第1弾リファクタリング(`docs/実装済/refactor-instructions.md`、Phase 0〜7)完了後のコードベースをレビューし、検出された残課題・潜在バグを是正するための指示書である。
> 実装担当モデルは本書の範囲内でのみ作業すること。第1弾の指示書および CLAUDE.md(PRD > steering > code、設計なき実装禁止、不明点は止まる)は引き続き有効。
> 対象リポジトリ: `~/Work/chromeExtensions/PageRecorder`

---

## 1. Objective

第1弾リファクタリング後のレビューで確認された以下を是正する。

1. **記録と実態の不一致を解消する**(旧 tasklist Phase 4 が実質未実施なのに完了扱いになっている)
2. **テスト基盤の潜在バグ・依存不整合を修正する**(`tests/setup.js` の jest-chrome 誤用、jest 29 と jest-environment-jsdom 30 の版数不整合)
3. **リファクタコミットに混入したテスト用設定値を是正する**(`scheduled-watch-sites.json` の baselineTime)
4. **テスト補助の過剰設計を簡素化する**(`tests/helpers/load-source-functions.js` の正規表現ベース関数抽出)
5. 軽微な残骸(未使用 devDependency)を整理する

新機能の追加、挙動変更、巨大 case(`startMonitoring` 等)の追加抽出は**行わない**。本書の目的は「第1弾の仕上げと正直な状態の回復」であり、構造整理の続きではない。

---

## 2. Project Understanding(第1弾完了後の現状)

### 2.1 前提

プロダクト概要・3つの監視系統(A: レガシー setInterval 監視 / B: 単一サイト定時在庫監視 / C: JSON ベース複数サイト定時在庫監視)・データフロー・外部拡張通知契約は `docs/実装済/refactor-instructions.md` の Section 2 を正とする。本書では差分のみ記す。

### 2.2 第1弾で変わったこと(レビューで確認済みの事実)

- `src/background/lib/stock-helpers.js`(353行)が新設され、純粋関数群(`generateFilename`、`normalizeScheduleTime`、`scheduleTimeToMinutes`、`resolveScheduleWindowSettings`、`createScheduleDate`、`getTodayScheduleTimeMs`、`getSiteAlarmName`、`extractSiteInfoFromAlarm`、`extractSiteIdFromAlarm`、`getSchedulesFromSite`、`formatJstStockTimestamp`、`formatJstTimestampReadable`、`extractKeywordFromUrl`、`buildAeonStockDownloadPath`、`buildBaselineLogText`、`buildStockLogText`、`normalizeStockProductUrl`、`diffStockProductUrls`、`parseCSVLine`)がカット&ペーストで移設済み。background.js 側に重複定義はない
- `background.js` は 5,702 → 5,333 行。冒頭の `importScripts` は `./monitoringConfigManager.js` → `./lib/stock-helpers.js` → `../lib/xlsx.full.min.js` の順
- onMessage switch から小さな6ケース(`loadConfig` / `saveConfig` / `changeMode` / `getStatus` / `getLogLevel` / `setLogLevel`)が `handleXxxMessage` 関数へ抽出済み。`startMonitoring`(約1,000行)・`startAllMonitoring`・`quickCapture` 等の巨大 case は**インラインのまま**(意図された部分実施)
- `package.json` は `page-recorder` v1.8.0 に統一、実在しないスクリプト参照は削除済み。jest 設定あり(`testEnvironment: "jsdom"`)
- `tests/setup.js`、`tests/helpers/load-source-functions.js`、`tests/unit/*.test.js`(特性テスト)が追加済み
- `manifest.json` から `web_accessible_resources` が削除済み(popup.html は popup.js のみ読込、SW の importScripts は WAR 不要のため安全と確認済み)
- `content.js` と `content_scripts` 登録は**維持**(`checkKeywordChange`(background.js L2800 付近)が `chrome.tabs.sendMessage(tabId, { action: 'getCurrentDOMState' })` で参照しているため。削除条件不成立)
- `pattern3-fix.js` は削除済み
- 提案書 `plan/docs/refactor-proposals.md` 作成済み(系統B/C統合、webhook ローテーション等)

### 2.3 絶対に壊してはいけない既存挙動(第1弾から継承、変更なし)

1. 系統C(複数サイト定時在庫監視)の全フロー: alarm 復元、ベースライン3点セット保存(`{siteId}/stock/{yyMMdd}/baseline_*.{png,html,txt}`)、`detected_*.txt`、スナップショット永続化、JST 表記
2. 外部拡張通知契約: `{ type: 'PAGE_RECORDER_STOCK_DETECTED', source, siteId, discordChannelId, urls, targetUrl, title, count }`
3. `chrome.storage.local` の既存キーと構造(`monitoring_config`、`scheduledStockSnapshots`、`scheduledStockLogs`、`scheduledStockWatchSession`、`scheduledWatchSessions` ほか)
4. `scheduled-watch-sites.json` の**スキーマ**(値の是正は本書 Phase 3 で扱うが、構造は不変)
5. ダウンロードファイル名制御(`#pr_` マーカー + `onDeterminingFilename`、`conflictAction: 'uniquify'`)
6. 系統A・Excel入出力・quickCapture・content.js 経由の `getCurrentDOMState` 連携の現挙動
7. `manifest.json`(本タスクでは一切変更しない)
8. background.js 末尾の `self.*` エクスポート(`runScheduledStockCheck` / `startScheduledStockWatch` / `formatJstStockTimestamp` / `buildAeonStockDownloadPath` / `extractKeywordFromUrl`)
9. **第1弾で追加された特性テストの期待値**(現実装の出力固定。テスト基盤を直す際に期待値を「あるべき仕様」へ書き換えない)

---

## 3. Behaviors To Preserve(検証チェックリスト)

各 Phase 完了時に該当項目を確認する。

- [ ] `npm test` が green(テスト件数が Phase 0 で記録した件数から**減っていない**こと)
- [ ] `chrome://extensions` で拡張をロードし、SW コンソールにエラーがないこと
- [ ] popup が開き、単一/複数モードタブが描画されること
- [ ] `src/` 配下の diff が、本書で明示的に許可されたファイルに限定されていること
- [ ] storage キー・通知 payload・ダウンロード命名に変更がないこと(該当 Phase のみ)

---

## 4. Non-Negotiables(絶対制約)

1. 最初に `git status` を確認する。未コミット変更があれば内容を報告し、自分の変更と混ぜない
2. 各 Phase = 独立コミット。revert 可能な単位を維持する
3. 無関係な整形・リネーム・「ついで」の修正をしない
4. テストを通すために本体(`src/`)の挙動を変えることを禁止。テストと実装が食い違ったらテスト側を疑い、判断できなければ Stop And Ask
5. `manifest.json`、storage キー、通知契約、`scheduled-watch-sites.json` のスキーマは変更しない
6. tasklist・ドキュメントの完了状態は実態と一致させる(CLAUDE.md「状態不一致」禁止)。**実施していない作業を完了と書かない**
7. 本書に記載のない削除・抽出・統合を行わない
8. ブランチは `refactor/` または `fix/` 系で作成する

---

## 5. Stop And Ask Conditions(即停止して人間に質問)

- 質問 Q1〜Q3(本書末尾)の回答が得られないまま該当 Phase に到達した場合
- jest / jest-environment-jsdom の版数変更で `npm install` 後に既存テストが落ち、原因がテスト側の修正で吸収できない場合
- `load-source-functions.js` の簡素化で、いずれかの特性テストの**結果が変わる**場合(期待値を書き換えれば通る、は禁止。挙動差の原因を報告して停止)
- `scheduled-watch-sites.json` の正しい運用値が Q2 の回答と現ファイルのどちらにも確信が持てない場合
- ログ整理(Phase 5)で、`shouldSuppressLog` の抑制対象文字列と置換対象が干渉する可能性を排除できない場合
- 本書に記載のない不整合・バグを発見した場合(修正せず報告のみ)

---

## 6. Baseline Commands

Phase 0 で実行し、`docs/実装済/refactor-baseline-2.md` に記録する。

```bash
git status
git log --oneline -5
node --version && npm --version
npm test 2>&1 | tail -15        # green の確認と「テスト件数」「スイート数」を必ず記録
grep -c "console.log" src/background/background.js src/ui/popup.js
node -e "const m=require('jest-chrome'); console.log(Object.keys(m))"   # 期待: [ 'chrome' ]
```

以後、各 Phase 末で `npm test`(件数含む)と `git diff --stat` を記録する。

---

## 7. Debt Map(是正対象一覧)

凡例 — 実装可否: ✅ 今回実装してよい / 🟡 質問の回答後に実施 / ⏭️ スキップ(回答により不要) / ❌ 提案のみ

### F1. tasks と実態の不一致(旧 Phase 4 未実施問題) ✅(Q1→実施)
- **根拠**: 第1弾 tasks の Phase 4 は「削除または logger.debug への寄せ先を整理する」が `[ ]` のまま、他項目と最終完了条件は `[x]`。実測では `console.log` 件数が background.js 181 / popup.js 439 で**第1弾前と完全に同一**であり、ログ整理は実質行われていない
- **なぜ負債か**: CLAUDE.md が禁じる「tasks と実装のズレ」そのもの。次にこのリポジトリを読むモデル/人間が「ログ整理済み」と誤認する
- **影響範囲**: steering の tasks(および done 記録があればそれも)。Q1 の回答次第で background.js
- **改善案**: Q1 の回答に従い、(a) ログ整理を本書 Phase 5 として実施する、または (b) tasks の Phase 4 を「未実施・スコープ外へ変更」と明記し完了条件の記述を実態に合わせる。**どちらの場合も記録の是正は必須**
- **検証**: tasks の全 `[x]` が実態と一致していることの突合報告

### F2. tests/setup.js の jest-chrome 誤用(潜在バグ) ✅
- **根拠**: 現状 `const chrome = require('jest-chrome'); global.chrome = chrome;`。jest-chrome のエクスポートは `{ chrome }`(名前付き)であり、この書き方では `global.chrome.runtime` が undefined になる(`global.chrome.chrome.runtime` に入る)
- **なぜ負債か**: 現テストが vm 方式で chrome モックを使わないため発覚していないだけ。将来 chrome API を使うテストを書いた瞬間に原因不明の undefined で詰まる
- **影響範囲**: `tests/setup.js` のみ
- **改善案**: `const { chrome } = require('jest-chrome'); global.chrome = chrome;` に修正。`afterEach(() => jest.clearAllMocks())` は維持
- **検証**: `npm test` green + 一時的な確認(セットアップが効いていることを `global.chrome.runtime` の存在チェックで確かめる小テストを書いてもよいが、恒久追加は任意)

### F3. jest 29 × jest-environment-jsdom 30 の版数不整合 ✅(Q3→第一候補採用)
- **根拠**: `package.json` devDependencies が `jest: ^29.7.0` と `jest-environment-jsdom: ^30.0.5` の組み合わせ。package-lock では 30.0.5 が確定している。jsdom env 30 は jest 30 系向けで、peer 整合が取れていない
- **なぜ負債か**: 現状たまたま動いていても、`npm ci` のやり直しや jest のマイナー更新で壊れる典型パターン
- **影響範囲**: package.json、package-lock.json
- **改善案(2段構え)**:
  1. **第一候補(採用)**: 現テスト(vm ベースの純粋関数テスト)は DOM を使っていないため、jest 設定の `testEnvironment` を `"node"` に変更し、`jest-environment-jsdom` を devDependencies から削除する(依存が1つ減り不整合自体が消える)。ただし**既存テストのいずれかが jsdom(document / window)を前提にしていないか全テストファイルを確認してから**実施する
  2. jsdom 前提のテストが存在する場合: `jest-environment-jsdom` を `^29.7.0` に揃える(最小変更)
- **検証**: `npm install` 後に `npm test` green、テスト件数不変

### F4. scheduled-watch-sites.json にテスト時刻が混入 ⏭️(Q2→問題無し・是正不要)
- **根拠**: aeon-pokemon の `baselineTime` が `"11:16"` になっている(第1弾前は `"09:42"`)。`scripts/set-test-times.js` 実行の残骸とみられる。schedules(15:47〜15:51 / 09:38〜09:42)も運用値として正しいか不明
- **なぜ負債か**: このままコミット/運用すると、毎日 11:16 にベースライン取得が実行される。リファクタコミットに無関係なランタイム値変更が混入している状態
- **影響範囲**: `src/config/scheduled-watch-sites.json`(値のみ。スキーマ不変)
- **改善案**: Q2 で人間に運用上の正しい `baselineTime` / `schedules` を確認し、その値に是正する。`src/config/scheduled-watch-sites.json.backup` が `--backup` 由来で正しい運用値を保持している場合は `node scripts/set-test-times.js --restore` でもよい(復元後に値を人間へ提示して確認を得る)
- **検証**: 是正後の JSON 全文を報告に含め、人間の確認を得る。`node scripts/set-test-times.js --backup` 相当の整合(スクリプトがエラーなく読めること)も確認

### F5. load-source-functions.js の過剰設計と脆弱性 ✅
- **根拠**: `tests/helpers/load-source-functions.js` は正規表現で関数を1つずつ切り出し(`extractFunctionSource` の境界判定は「行頭の `function` / `const` / `let` / `var` / コメント」)、`backgroundDependencies` マップで依存順を手管理している。これは第1弾 Phase 2 時点(background.js 本体から抽出する必要があった頃)の名残
- **なぜ負債か**: 移設後の `stock-helpers.js` は**副作用ゼロの関数宣言のみ**のファイルであり、ファイル全体を1回 `vm.runInContext` すれば依存順管理も境界判定も不要。現方式は、将来ヘルパー関数内のテンプレートリテラルに行頭 `function` 等の文字列が入った瞬間、静かに壊れる
- **影響範囲**: `tests/helpers/load-source-functions.js`、それを参照する `tests/unit/*.test.js` の import 部分(テストの**期待値・アサーションは一切変更しない**)
- **改善案**:
  - `loadBackgroundFunctions(functionNames, extraContext)`: stock-helpers.js を `fs.readFileSync` で全文読み込み → `createContext(extraContext)` で1回 `vm.runInContext` → `functionNames` を context から取り出して返す。`backgroundDependencies` マップと `collectDependencies` は削除
  - `loadContentFunctions` は現状維持(content.js は IIFE 内のため brace 方式の抽出が引き続き必要)。`extractFunctionSource`(境界regex版)が不要になる場合は削除し、`extractFunctionSourceByBraces` のみ残す
  - 関数シグネチャ(呼び出し側 API)は変えない — テストファイル側の変更をゼロまたは最小にするため
- **検証**: `npm test` green、**テスト件数・各テストの合否が変更前と完全一致**。1件でも結果が変わったら Stop And Ask(期待値の書き換えで吸収することを禁ずる)

### F6. 未使用 devDependency `js-yaml` ✅
- **根拠**: 第1弾で yml-sync 系スクリプトを削除済みだが、`js-yaml: ^4.1.0` が devDependencies に残存。src/ と tests/ に require/import なし(実装前に grep で再確認すること)
- **改善案**: grep で無参照を確認のうえ devDependencies から削除し、`npm install` で lock を更新
- **検証**: `npm test` green

### F7. ログ整理(旧 Phase 4 の本体) ✅(Q1→実施)
- **根拠**: background.js に生 `console.log` 181箇所(例: `checkKeywordChange` 冒頭の `🔍 [checkKeywordChange]` 系)。独自 `logger` + `shouldSuppressLog` が存在するのに使われていない箇所が多い
- **改善案(実施する場合の制約)**: 第1弾指示書 D8 の制約をそのまま適用する — ①対象は「明らかに一時デバッグと判る行」のみ(`🔵 [DEBUG]`、`🔍 [...]` 等のトレース系)、②`logger.debug` へ置換しメッセージ文字列自体は変えない、③置換前に必ず `shouldSuppressLog` の抑制対象文字列と干渉しないことを確認、④1コミット30箇所以内、⑤popup.js は logger 基盤がないため対象外(現状確認のうえ。基盤新設はしない)、⑥`console.error` / `console.warn` は触らない
- **検証**: npm test + 実機 SW ログ確認(不可なら人間向け手順を提示)

### F8. generateFilename の配置とグローバル logger 依存 ❌(提案のみ)
- **根拠**: `generateFilename` は系統A(レガシー監視)のファイル名生成ロジックだが `stock-helpers.js` に同居しており、かつグローバル `logger` に依存するため、stock-helpers.js は単体ロードで完結しない(logger なし環境で呼ぶと ReferenceError。テストは context へ logger を注入して回避している)
- **改善案**: `plan/docs/refactor-proposals.md` に追記する — (a) 系統A用ヘルパーへの分離(ファイル名変更/新設)、(b) mcmLogger と同様の `typeof logger !== 'undefined'` ガード追加、の2案と各リスク。**コード変更はしない**(ガード追加もフォールバック分岐という挙動追加のため承認対象)
- **検証**: 提案書の追記内容レビューのみ

### F9. onMessage 巨大 case の残り(startMonitoring 等) ❌(提案のみ・記録のみ)
- **根拠**: 第1弾 Phase 5 ②は小さな6ケースの抽出で終了しており、`startMonitoring`(約1,000行)・`startAllMonitoring`・`quickCapture`・`exportMonitoringSettings`・`importMonitoringSettings` はインラインのまま。第1弾 tasklist では Phase 5 全体が `[x]`
- **改善案**: 本タスクでは抽出を**行わない**(系統Aのロジックを含み回帰リスクが高いため)。F1 の記録是正の際に「Phase 5 ②は部分実施。残ケースは未抽出」と steering 文書へ明記し、残ケース一覧を `plan/docs/refactor-proposals.md` へ継続タスクとして追記する
- **検証**: 文書追記のレビューのみ

---

## 8. Implementation Phases

> 各 Phase は独立コミット。Phase N が green でない限り N+1 へ進まない。
> Q1・Q2 の回答が事前に得られている前提。未回答なら該当 Phase で停止する。

### Phase 0: 現状記録(変更なし)
1. `git status` / `git log` 確認。未コミット変更があれば報告して停止
2. ブランチ `fix/refactor-followup` を作成
3. Section 6 の Baseline Commands を実行し `docs/実装済/refactor-baseline-2.md` に記録(**テスト件数を必ず控える**)

### Phase 1: テスト基盤の是正(F2, F3, F6)
1. `tests/setup.js` を `const { chrome } = require('jest-chrome');` 方式へ修正
2. 全テストファイルを確認し、DOM(document / window / jsdom 由来 API)への依存有無を報告
3. 依存なし → jest 設定 `testEnvironment: "node"` へ変更し `jest-environment-jsdom` を削除。依存あり → `jest-environment-jsdom@^29.7.0` へ揃える
4. `js-yaml` の無参照を grep で確認し devDependencies から削除
5. `npm install` で lock 更新 → `npm test`
6. 検証: green かつテスト件数が Phase 0 と一致

### Phase 2: テスト補助の簡素化(F5)
1. `loadBackgroundFunctions` を「stock-helpers.js 全文を1回 vm.runInContext」方式へ書き換え(API シグネチャ不変)
2. `backgroundDependencies` / `collectDependencies` / 不要になった `extractFunctionSource` を削除
3. `loadContentFunctions`(brace 抽出)は維持
4. 検証: `npm test` green、テスト件数・合否が Phase 0 と完全一致。差異があれば Stop And Ask

### Phase 3: 設定値の確認(F4)— Q2 回答済み: 問題無し
> **Q2 回答により是正不要。現状値を確認・記録のみ。**

1. `scheduled-watch-sites.json` の現在値を確認・記録する(変更なし)
2. 検証: JSON が valid であること、`scripts/set-test-times.js` がエラーなく読めること

### Phase 4: 記録の是正(F1, F9 の文書部分)— Q1 回答済み: 実施する
1. 第1弾 steering の tasklist を実態に合わせて修正: Phase 4(ログ整理)の実施状況、Phase 5 ②の部分実施(残ケース一覧つき)を正確に記載
2. `plan/docs/refactor-proposals.md` へ F8(generateFilename)と F9(残 case 抽出)を継続提案として追記
3. 検証: 文書 diff のレビュー(コード変更ゼロであること)

### Phase 5: ログ整理(F7)— Q1 回答済み: 実施する
1. F7 の制約①〜⑥に従い、background.js の一時デバッグログを `logger.debug` へ置換(30箇所/コミット以内で分割)
2. 各コミットで `shouldSuppressLog` との干渉チェック結果を記録
3. 検証: `npm test` green + 実機 SW ログ確認(不可なら人間向け確認手順を出力)
4. 完了後、Phase 4 で修正した tasklist の記載を「実施済み」へ更新

### Phase 6: 仕上げ
1. 全 Phase の検証結果・テスト件数推移・未実施の手動テストを整理
2. Reporting Format に従い最終報告を作成

---

## 9. Verification Requirements

- 各 Phase 末: `npm test`(件数つき)、`git diff --stat`
- Phase 1〜2 は「テスト件数と合否が Phase 0 と完全一致」を回帰判定の基準とする。期待値の書き換えによる吸収は禁止
- Phase 3 完了時: 人間の値確認を必須とする(コミット前)
- Phase 5 実施時: 拡張ロード + SW コンソール確認。系統Cの実機確認(`scripts/set-test-times.js` + `tests/docs/scheduled-stock-diff-detection-verification.md`)が可能なら実施、不可なら人間向け手順を提示
- いずれの Phase でも `src/` の diff は許可ファイル(Phase 5 の background.js、Phase 3 の scheduled-watch-sites.json)以外に発生させない

---

## 10. Reporting Format

各 Phase 完了時:

```
## Phase N 報告
- 変更ファイルと diff 行数:
- npm test 結果(スイート数 / テスト件数 / 合否):
- 挙動不変・記録一致の根拠:
- Stop And Ask 事項:
- 次 Phase へ進む可否:
```

最終報告には、最後に実行した全コマンドと結果、テスト件数の推移表(Phase 0 → 最終)、未実施の手動テスト一覧(人間向け手順つき)、提案書への追記内容を含める。

---

## 11. Out-of-scope Items(本タスクで実装しないもの)

- `startMonitoring` / `startAllMonitoring` / `quickCapture` 等の巨大 case 抽出(F9: 提案・記録のみ)
- `generateFilename` の移設・ガード追加(F8: 提案のみ)
- 系統A/B/C の統合・廃止、storage キー再設計(第1弾提案書の領域)
- `manifest.json` の一切の変更
- popup.js のログ整理・logger 基盤新設
- 特性テストの期待値変更、テストの削除
- webhook ローテーション等の運用作業(人間が実施)
- 新機能の追加全般

---

## 12. 実装前に確認すべき質問(人間が回答してから着手)

**Q1. 旧 Phase 4(background.js のログ整理)を今回実施しますか?**
- (a) 実施する → 本書 Phase 5 を実行
- (b) 実施しない → tasklist を「未実施・スコープ外」へ是正するのみ(Phase 4 まで)
どちらでも「記録の是正」は必ず行います。

> **回答 (2026-06-12): (a) 実施する**
> → Phase 5 を実行する。

**Q2. `scheduled-watch-sites.json` の運用上正しい時刻設定を教えてください。**
現状: aeon-pokemon の baselineTime が `11:16`(テスト残骸の疑い)、schedules は aeon `15:47-15:48 / 15:49-15:51`、toysrus baselineTime `09:42`、schedules `09:38-09:39 / 09:40-09:42`。本番運用で意図している値(または「.backup から restore でよい」)を指定してください。

> **回答 (2026-06-12): 問題無し**
> → 現状の設定値で運用上問題ない。Phase 3 での是正は不要。

**Q3. (任意)`testEnvironment` を `node` へ変更して `jest-environment-jsdom` を削除する案を許可しますか?**
既存テストが DOM 非依存であることが確認できた場合のデフォルト案です。不許可なら `jest-environment-jsdom@^29` への揃えのみ行います。

> **回答 (2026-06-12): ベストプラクティスで実施**
> → testEnvironment を `"node"` へ変更し、jest-environment-jsdom を削除する。
