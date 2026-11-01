# 実装済み: リファクタリング指示書

> 本書は 2026-06-13 完了の第1弾リファクタリング計画を履歴として保管した実装済み文書である。
> 関連 steering: `.steering/done/2606/20260612-refactor-instructions/`
> 後続の差分整理は `docs/実装済/refactor-instructions-phase2.md` を参照すること。
> 対象リポジトリ: `~/Work/chromeExtensions/PageRecorder`

---

## 1. Objective

既存仕様(特に運用中の「定時在庫監視」フロー)を一切壊さずに、以下を達成する。

1. 壊れている検証基盤(npm test / 存在しないnpmスクリプト)を「正直な状態」に修正し、最低限の安全網(ユニットテスト)を純粋関数に対して整備する
2. 明確な死コードと機密情報の混入を、承認済みの範囲で除去する
3. `background.js`(5,702行)の純粋関数群を、挙動を変えずにモジュール分割可能な形に整理する(段階的・小さく)
4. 単一サイト版/複数サイト版で重複している定時在庫監視パイプラインの統合は **提案のみ** とし、勝手に実装しない

見た目の綺麗さは目的ではない。**「変更しやすく、検証可能で、嘘のない状態」** にすることが目的である。

---

## 2. Project Understanding

### 2.1 プロダクト概要

PageRecorder は Manifest V3 の Chrome 拡張機能。EC サイト(現運用: AEON / トイザらス のポケモンカード商品一覧)を対象に、ページの HTML・スクリーンショットを取得・保存し、キーワード変化や商品件数増加を検知する「購入フロー第1フェーズ(情報収集)」担当ツール。検知時は外部拡張 `discord_post_url_monitor`(ID は設定ファイル内 `externalExtensionId`)へ `chrome.runtime.sendMessage(extensionId, ...)` で通知し、既存の購入導線へ接続する。

ドキュメント体系: `CLAUDE.md`(最上位原則: PRD > steering > code、設計なき実装禁止) → `PRD/`(要件・設計) → steering 文書(`requirements.md` / `design.md` / `tasks.md` / `decisions.md` / `blockers.md`)。**実装担当モデルもこの原則に従うこと。**

### 2.2 共存する3つの監視系統(最重要の理解)

`src/background/background.js` には独立した3系統の監視が共存している。

| 系統 | 起動方法 | タイマー | 主担当コード | 現状 |
|---|---|---|---|---|
| A. レガシー単一/複数URLキーワード監視 | popup の「監視開始」「全て開始」 | **`setInterval`**(SW内、background.js L4521/L4545/L5012) | onMessage の `startMonitoring` / `startAllMonitoring` ケース内に巨大なインライン `monitoringLogic` | PRD に記載の本来機能。MV3 の SW 休止で停止し得る既知の脆弱構造 |
| B. 単一サイト定時在庫監視(popup設定ベース) | popup 設定 `scheduleEnabled` 等 → `syncScheduledStockCheck` | `chrome.alarms`(`dailyStockCheck` / `stockWatchTick`) | `startScheduledStockWatch` ~ `runStockWatchTickInternal`(L2338–2700付近) | steering 文書(requirements/design)で追加された系統 |
| C. 複数サイト定時在庫監視(JSONベース) | 拡張パッケージ内 `src/config/scheduled-watch-sites.json` を `fetch` → `syncMultiSiteScheduledCheck` | `chrome.alarms`(`dailyStockCheck_{siteId}_{i}` / `stockWatchTick_{siteId}` / `baselineFetch_{siteId}`) | `startScheduledStockWatchForSite*` / `runStockWatchTickForSite*` / `handleMultiSiteDetection` / `fetchBaselineForSite`(L885–1555付近) | done.md / 手動テスト文書から判断して **現役の主運用系統** |

系統 B と C はほぼ同じ責務(セッション管理、tick二重実行ロック、スナップショット比較、ベースライン保存、検知時ログ/通知/URLオープン)を別実装で持つ。**統合は影響が大きいため本書では提案止まり(Phase 7)。**

### 2.3 エントリーポイント

- Service Worker: `src/background/background.js`(`importScripts('./monitoringConfigManager.js')` と `importScripts('../lib/xlsx.full.min.js')` を先頭で実行)
- Popup UI: `src/ui/popup.html` + `popup.js`(5,181行)
- Content Script: `src/content/content.js`(`<all_urls>`, `document_idle`)
- Offscreen Document: `src/offscreen/offscreen.html` + `offscreen.js`(Blob URL 生成/失効。`ensureOffscreenDocument` から `reasons: ['BLOBS']` で生成)
- 設定ファイル: `src/config/scheduled-watch-sites.json`(拡張に同梱。`chrome.runtime.getURL` + `fetch` で読込)
- 開発支援: `scripts/set-test-times.js`(テスト用に JSON の時刻を書き換える Node スクリプト)

### 2.4 主要モジュールと責務

| ファイル | 行数 | 責務(実態) |
|---|---|---|
| `src/background/background.js` | 5,702 | 上記3系統の監視全部、ダウンロード(ファイル名マーカー方式 `#pr_xxx` + `onDeterminingFilename`)、Cloudflare チャレンジ対応、offscreen 管理、Excel/CSV 最小実装フォールバック、logger、onMessage の巨大 switch(21ケース、L3492–約5560)、アラームディスパッチ |
| `src/background/monitoringConfigManager.js` | 1,894 | `monitoring_config` の CRUD・モード切替・レガシーストレージ移行・バックアップ・healthCheck・Excel入出力 |
| `src/background/pattern3-fix.js` | 68 | **どこからも参照されていない**。過去の修正計画メモがコメントとして残っているだけの死ファイル |
| `src/content/content.js` | 279 | MutationObserver による DOM 監視。ただし後述の通り **background 側に対応する送受信コードが存在しない** |
| `src/ui/popup.js` | 5,181 | UI制御、設定保存(デバウンス)、フォールバック configManager、Excel入出力UI |
| `src/lib/xlsx.full.min.js` | - | SheetJS(読込失敗時は background.js 内の最小 XLSX 実装にフォールバック) |

### 2.5 データフロー(系統C・現役パス)

```
alarm発火(dailyStockCheck_{siteId}_{i})
→ startScheduledStockWatchForSite: scheduled-watch-sites.json 読込
→ セッション作成(storage.local: scheduledWatchSessions)+ 検査タブ確保(ensureScheduledWatchInspectionTab)
→ tick alarm(stockWatchTick_{siteId})で runStockWatchTickForSite
→ ページ準備待ち(waitForProductListReady、Cloudflare対応含む)
→ captureScheduledSnapshot(executeScript で件数・商品URL抽出)
→ diffStockProductUrls で前回スナップショット(scheduledStockSnapshots)と比較
→ 増加検知時: handleMultiSiteDetection
   ├ saveScheduledStockLog(downloads でテキストログ保存: ~/Downloads/{siteId}/stock/{yyMMdd}/)
   ├ openDetectedUrls(設定 openProductUrl 時)
   └ notifyExternalExtension(設定 notifyOtherExtensions 時、外部拡張へ sendMessage)
別系統: baselineFetch_{siteId} → fetchBaselineForSite → saveScheduledStockBaselineArtifacts
   (offscreen 経由 Blob URL で baseline_{ts}.png/html/txt を保存、persistStockSnapshot で永続化)
```

設定保存フロー: popup → onMessage(`saveConfig` 等) → `configManager`(background.js 内ラッパー L3253) → `loadConfig`/`saveConfig`(L2908) → `ensureMonitoringConfigManager` → `MonitoringConfigManager`(storage.local キー `monitoring_config`)。**4層の委譲**になっている。

### 2.6 外部依存

- 外部サーバー/API: なし(ローカル完結)。ただし他拡張 `discord_post_url_monitor` への external messaging 連携あり(検知通知の出口)
- SheetJS(同梱)、Jest 一式(devDependencies)
- 監視対象サイトの DOM 構造(`scheduled-watch-sites.json` の selectors に依存。AEON は件数正規表現にも依存)

### 2.7 現在の検証手段

- 自動テスト: **実質ゼロ**。`package.json` の jest 設定は `tests/setup.js` と `tests/**/*.test.js` を参照するが、`tests/` には手動テスト手順の md/pdf しか存在しない。`npm test` は現状失敗するはず(Phase 1 で実測して記録すること)
- `package.json` の `project*` / `test:phase*` / `dashboard*` / `sync*` スクリプトが参照する `scripts/project-manager.js` `test-manager.js` `progress-dashboard.js` `yml-markdown-sync.js` は **存在しない**(scripts/ には set-test-times.js と README のみ)
- 実検証は手動: `tests/docs/scheduled-stock-diff-detection-verification.md`、`tests/docs/aeon-scheduled-stock-check-sw-manual.md`、`docs/複数サイト通知先分離の手動テスト手順.md` 等 + `scripts/set-test-times.js` での時刻設定

### 2.8 絶対に壊してはいけない既存挙動

1. **系統C(複数サイト定時在庫監視)の全フロー**: alarm 復元(onInstalled/onStartup の `syncScheduledStockCheck`)、ベースライン3点セット保存(`~/Downloads/{siteId}/stock/{yyMMdd}/baseline_{yyMMdd-hhmmss}.{png,html,txt}`、done.md で受入済み)、`detected_*.txt` 保存、スナップショット永続化(`scheduledStockSnapshots`)、JST タイムスタンプ表記
2. **外部拡張通知の message 契約**: `{ type: 'PAGE_RECORDER_STOCK_DETECTED', source: 'PageRecorder', siteId, discordChannelId, urls, targetUrl, title, count }`(tests/memo.md に実例)。フィールド名・型を変更しない
3. **`chrome.storage.local` の既存キーとスキーマ**: `monitoring_config`、`scheduledStockSnapshots`、`scheduledStockLogs`、`scheduledStockWatchSession`、`scheduledWatchSessions`、Cloudflare セッション系。ユーザーの保存済みデータが載っているため、キー名・構造変更は禁止
4. **`scheduled-watch-sites.json` のスキーマ**: `scripts/set-test-times.js` と運用手順がこの構造に依存
5. **ダウンロードファイル名制御**: `#pr_` マーカー + `onDeterminingFilename` の仕組み、`conflictAction: 'uniquify'`
6. **レガシー監視(系統A)・Excel入出力・quickCapture の現挙動**: 使用状況が不明なため「現状維持」が正。改善は提案のみ
7. **manifest の permissions / content_scripts 構成**(Phase 6 の提案承認まで変更禁止)
8. **SW コンソール手動確認用の `self.*` エクスポート**(background.js 末尾): 運用手順書が使用しているため残す

---

## 3. Behaviors To Preserve(検証チェックリスト)

各 Phase 完了時、該当するものを必ず確認する。

- [ ] `npm test`(Phase 1 以降は green であること。Phase 1 で baseline を記録)
- [ ] 拡張を `chrome://extensions` で読み込み、SW コンソールにエラーがないこと(構文エラー・importScripts 失敗の検出)
- [ ] popup が開き、単一/複数モードタブが描画されること
- [ ] `node scripts/set-test-times.js --backup && node scripts/set-test-times.js --site aeon-pokemon` 実行 → 拡張リロード → baseline 3ファイル保存と tick 動作を `tests/docs/scheduled-stock-diff-detection-verification.md` の手順で確認 → `--restore`
- [ ] storage キー(`monitoring_config` 等)の構造が変更前後で同一であること(`debugStorageContents` または SW コンソールで確認)

実機確認ができない環境の場合は、その旨を報告に明記し、コードレビューで確認した内容と「人間が実行すべき手動テスト手順」を列挙すること。

---

## 4. Non-Negotiables(絶対制約)

1. 最初に `git status` を確認する。既存の未コミット変更がある場合は内容を報告し、**自分の変更と混ぜない**(必要なら作業前に人間へ stash/commit を依頼)
2. 編集前に baseline の検証結果(`npm test` の出力、git status、対象ファイルの行数)を記録する
3. 変更は小さく、Phase ごとに独立して revert 可能な単位にする(1 Phase = 1 コミット粒度を目安)
4. 無関係な整形・リネーム・「ついで」のリファクタリングをしない。diff は意図した変更のみで構成する
5. 既存挙動を勝手に変えない。挙動が変わる可能性のある変更は Stop And Ask へ
6. 正しさが不明な場合は実装を止めて質問する(CLAUDE.md「不明点は止まる」に従う)
7. 各 Phase 完了ごとに Section 3 の検証を実施し、結果を記録する
8. `chrome.storage` キー、外部メッセージ契約、ダウンロードパス/ファイル名形式、`scheduled-watch-sites.json` スキーマ、manifest は変更しない(承認された Phase を除く)
9. 大規模削除・全面書き換えは禁止。削除は本書で「死コードと確認済み」と明記したものに限る
10. ブランチは `refactor/xxx` 形式で作成する(development-guidelines.md 準拠)

---

## 5. Stop And Ask Conditions(即停止して人間に質問)

以下に該当したら実装を止め、状況と選択肢を提示して承認を待つ。

- レガシー監視(系統A)/Excel入出力/quickCapture のコードに触れる必要が生じた場合(使用状況不明のため)
- `monitoring_config` のスキーマや `MonitoringConfigManager` の移行・バックアップロジックに変更が必要になった場合(保存済みユーザーデータに影響)
- 外部拡張連携(`notifyExternalExtension`、message 契約)に触れる場合
- manifest.json(permissions、content_scripts、web_accessible_resources)の変更が必要になった場合
- テストを書く過程で「実装とドキュメント(PRD/steering)が矛盾している」と判明した場合 — どちらが正かを勝手に決めない
- 関数の挙動が分岐条件によって意図的か不具合か判別できない場合(例: 系統Bと系統Cの微妙な挙動差)
- 削除候補が本書記載以外に見つかった場合
- 1ファイルの変更が 300 行 diff を超えそうな場合(Phase 5 のモジュール分割を除く)

---

## 6. Baseline Commands

Phase 1 で以下を実行し、出力を `plan/refactor-baseline.md`(新規)に記録する。

```bash
git status
git log --oneline -5
node --version && npm --version
npm test 2>&1 | tail -20          # 現状は失敗する想定。失敗内容を記録
wc -l src/background/*.js src/ui/popup.js src/content/content.js
node scripts/set-test-times.js --backup   # 設定の安全確保(実機テストする場合)
```

以後、各 Phase 末で `npm test` と `git diff --stat` を記録する。

---

## 7. Debt Map(技術的負債一覧)

凡例 — 実装可否: ✅ 今回実装してよい / 🟡 条件付き(該当Phaseの指示に従う) / ❌ 提案のみ(承認なしに実装禁止)

### D1. 検証基盤が嘘をついている ✅
- **根拠**: `package.json` — jest 設定が `tests/setup.js`・`tests/**/*.test.js` を参照するが存在しない。`project*`/`test:phase*`/`dashboard*`/`sync*` スクリプトの参照先 `scripts/*.js` 4本が存在しない
- **なぜ負債か**: `npm test` が壊れており、リファクタリングの安全網が機能しない。存在しないスクリプトは読み手を誤導する
- **影響範囲**: package.json、tests/
- **変更リスク**: 低(ランタイムコードに影響なし)
- **改善案**: 存在しないスクリプトを package.json から削除(またはコメント化不可のため削除)。`tests/setup.js`(jest-chrome セットアップ)を新規作成し、`npm test` を「0テストでも green」にする → Phase 2 でテスト追加
- **検証**: `npm test` が成功する

### D2. 純粋関数にテストがない ✅
- **根拠**: background.js に副作用のない関数が多数(`normalizeScheduleTime` L213、`scheduleTimeToMinutes` L217、`resolveScheduleWindowSettings` L222、`createScheduleDate` L247、`getSiteAlarmName` L844、`extractSiteInfoFromAlarm` L852、`extractSiteIdFromAlarm` L877、`getSchedulesFromSite` L885、`formatJstStockTimestamp` L1556、`formatJstTimestampReadable` L1582、`extractKeywordFromUrl` L1599、`buildAeonStockDownloadPath` L1612、`normalizeStockProductUrl` L2052、`diffStockProductUrls` L2065、`buildBaselineLogText` L1882、`buildStockLogText` L1963、`generateFilename` L107、`parseCSVLine` L2860 など)。content.js の `normalizeText` も同様
- **なぜ負債か**: アラーム名解析・差分判定・パス生成は系統Cの中核ロジックだが、回帰検知手段が手動テストしかない
- **影響範囲**: tests/(新規)。本体コードはこの段階では変更しない
- **変更リスク**: 低(テスト追加のみ。ただし SW グローバル前提のコードをテストから読み込む工夫が必要 — Phase 2 参照)
- **改善案**: 特性テスト(characterization test)として現挙動をそのまま固定する。期待値は実装から導出し、「あるべき仕様」への修正はしない
- **検証**: `npm test` green、カバレッジ対象に上記関数が含まれる

### D3. 死コード: `src/background/pattern3-fix.js` ✅(削除は承認後 🟡)
- **根拠**: `grep pattern3` が manifest / background.js / popup.js / monitoringConfigManager.js のいずれにもヒットしない。中身はコメント化された過去の修正計画と `console.log` 1行のみ
- **なぜ負債か**: src/ 配下にあるため読み手が「ロードされるモジュール」と誤解する
- **影響範囲**: 当該ファイルのみ
- **変更リスク**: 極低
- **改善案**: 削除、または歴史的価値があるなら `docs/` へ移動。**削除前に質問Q2の回答を得ること**
- **検証**: 拡張ロードでエラーなし

### D4. content.js が宙に浮いている ❌(提案のみ)
- **根拠**: content.js は `domStateChanged` / `contentScriptReady` を background へ送信し、`startDOMWatching` 等の受信を待つが、background.js にこれらの action を扱うコードが**一切存在しない**(grep 0件)。background は `chrome.scripting.executeScript`(24箇所)で直接注入する方式に移行済み
- **なぜ負債か**: `<all_urls>` の全ページに毎回ロードされる実質無機能スクリプト。パフォーマンス・プライバシー上のフットプリントであり、background の onMessage には `domStateChanged` が default(Unknown action)で処理されるノイズも発生し得る
- **影響範囲**: manifest.json(content_scripts)、content.js
- **変更リスク**: 中 — manifest 変更 + 「本当にどこからも使われていないか」は実機の全機能確認が必要。レガシー監視(系統A)が将来 content.js 方式へ戻す前提の可能性もある
- **改善案**: content_scripts 登録の削除を提案(質問Q3)。承認まで現状維持
- **検証**: 承認後に実施する場合、系統A/B/C と quickCapture の手動テスト一式

### D5. background.js 5,702行のモノリス / onMessage 巨大switch 🟡(Phase 5 の範囲のみ)
- **根拠**: onMessage リスナー(L3492)内の switch に 21 ケース。`startMonitoring`(L3548–4564) と `startAllMonitoring`(L4645–5064) の内部に、ほぼ同型の `monitoringLogic` が**インラインで重複定義**されている(setInterval 登録 L4521/L4545/L5012、削除処理も複数箇所に散在)
- **なぜ負債か**: 1関数が1,000行級で、修正時の影響範囲が読めない。系統A/B/Cと横断機能(DL、Cloudflare、Excel)が同一ファイルに同居し、責務境界がない
- **影響範囲**: background.js 全体
- **変更リスク**: 高(MV3 SW は ES Modules を使うなら manifest 変更が必要。現状は importScripts 方式)
- **改善案(段階)**: ①純粋関数群を `src/background/lib/*.js` へ移し `importScripts` で読み込む(挙動不変・低リスク) ②switch の各 case を名前付き関数へ抽出(同ファイル内、挙動不変) ③系統A の monitoringLogic 重複統合は**提案のみ**(挙動差の有無をコードだけで保証できないため)
- **検証**: 各ステップで Section 3 全項目

### D6. 系統B/C の重複パイプライン ❌(提案のみ)
- **根拠**: `runStockWatchTick`/`runStockWatchTickForSite`、`startScheduledStockWatch(Internal)`/`startScheduledStockWatchForSite(Internal)`、`handleStockWatchDetection`/`handleMultiSiteDetection`、`endStockWatchSession`/`endMultiSiteSession`、セッションキー(`scheduledStockWatchSession` vs `scheduledWatchSessions`)が二重化
- **なぜ負債か**: 修正が常に2箇所必要(done.md の baseline 改修も実際は系統横断)。ロック方式も `stockWatchTickInFlight`(単一変数)と `multiSiteTickLocks`(Map)で不揃い
- **影響範囲**: 系統B/C 全域、storage キー、popup 設定
- **変更リスク**: 高 — 系統Bがまだ使われているか不明(質問Q1)。storage キー統合はユーザーデータ移行を伴う
- **改善案**: 「系統Cに片寄せし系統Bは互換レイヤ化 or 廃止」の設計案を提示して承認を得る
- **検証**: 承認後に別タスクとして実施

### D7. setInterval によるレガシー監視(系統A)の MV3 脆弱性 ❌(提案のみ)
- **根拠**: L4521/L4545/L5012 の `setInterval` は SW 休止で消滅する。pattern3-fix.js のメモも同領域の不具合履歴を示す
- **なぜ負債か**: PRD の主要シナリオ(1.3〜1.5)を担う機能が構造的に不安定
- **改善案**: chrome.alarms ベースへの移行を提案(系統Cの方式を流用)。ただし系統Aの現役利用有無(質問Q1)次第で「廃止」も選択肢
- **変更リスク**: 高。提案のみ

### D8. ログの不統一・過剰 🟡(Phase 4 で限定実施)
- **根拠**: 独自 `logger` + `shouldSuppressLog`(L3025)があるのに、生 `console.log` が background.js に181、popup.js に439、MCM に75箇所。絵文字付き DEBUG ログが本番経路に常時出力
- **なぜ負債か**: SW コンソールが汚染されデバッグ性が低下。ログレベル機構(`getLogLevel`/`setLogLevel`)が形骸化
- **改善案**: **機械的に安全な範囲のみ**: 明らかな一時デバッグ行(`🔵 [DEBUG]` プレフィックス等)を logger.debug へ置換。メッセージ文字列自体は変えない(shouldSuppressLog がメッセージ文字列でフィルタしているため、**置換対象が suppress 対象に該当しないか必ず確認**)。大規模な置換はしない
- **変更リスク**: 低〜中(suppress フィルタとの干渉に注意)
- **検証**: npm test + 実機で SW ログ確認

### D9. 機密情報の混入 🟡(質問Q4 の承認後)
- **根拠**: `tests/memo.md` に Discord webhook URL が2本平文で記載。`backup/` には `discordChannelId-externalExtensionId` 入り設定のコピー
- **なぜ負債か**: webhook URL は所持者が投稿可能な実質クレデンシャル。リポジトリ同梱は漏えいリスク
- **改善案**: memo.md から webhook を除去し、人間に**ローテーション(再発行)を推奨**。コードは webhook を参照していない(拡張連携は extensionId 経由)ため動作影響なし
- **変更リスク**: 低(ドキュメントのみ)。ただし運用メモのため削除は承認後

### D10. 設定ファイルとバックアップの散在 ✅(整理は最小限)
- **根拠**: `src/config/scheduled-watch-sites.json.backup`(set-test-times.js の正規バックアップ先)に加え、`backup/` 直下と `backup/2026/06/` に日付付きコピーが複数。`src/config/README.md` あり
- **なぜ負債か**: どれが正かが新規参加者に不明。.gitignore は backup/ を除外指定しているが実体が残っている可能性
- **改善案**: ファイル移動・削除はしない。`src/config/README.md` または Index.md に「正は src/config/scheduled-watch-sites.json、バックアップ運用は set-test-times.js --backup/--restore」と明記する(ドキュメント追記のみ)
- **変更リスク**: 極低

### D11. ドキュメントと実態の乖離 ✅(ドキュメント修正のみ)
- **根拠**: Index.md が存在しない `src/background/config-manager.js` を記載。repository-structure.md が存在しない `TODO/`、`docs/guidelines/`、`tests/unit|integration|e2e/`、`scripts/create-todo.sh` を記載。package.json 名 `summary-autoreload-downloader` v1.4.0 と manifest 名 `PageRecorder` v1.8.0 の不一致。architecture.md の権限リストは manifest の実態(`cookies`、`offscreen`、`downloads.shelf` 等)より少ない
- **なぜ負債か**: CLAUDE.md は「PRD が正」と定めるが、PRD/索引が実態より古いと判断基準が壊れる
- **改善案**: 実態に合わせてドキュメント側を修正(Index.md、repository-structure.md の該当行、architecture.md の権限表)。**仕様変更ではなく事実の追従のみ**。package.json の name/version 統一は人間の意図確認後(質問Q5)
- **変更リスク**: 極低

### D12. XLSX 最小実装フォールバックの責務混在 ❌(提案のみ)
- **根拠**: background.js 先頭(L11–105)に SheetJS 読込失敗時の最小 XLSX 実装 + `encode_cell`/`decode_range`/`createMinimalWorkbook`/`parseCSVLine` がインライン。MCM 側にも `loadSheetJSLibrary` があり読込経路が二重
- **なぜ負債か**: 監視 SW の冒頭を Excel 互換コードが占有し、フォールバック品質(xlsx を CSV として読む)の妥当性も不明
- **改善案**: Phase 5 ①で別ファイルへ移動(挙動不変)。フォールバック自体の要否は質問Q6
- **変更リスク**: 移動のみなら低

### D13. web_accessible_resources の広い公開 ❌(提案のみ)
- **根拠**: manifest が `src/lib/*` を `<all_urls>` に公開。現コードで web ページから lib を参照する箇所は確認できなかった
- **なぜ負債か**: 不要なら攻撃面・フィンガープリント面の拡大
- **改善案**: 削除を提案(質問Q7)。manifest 変更のため承認必須

### D14. エラーハンドリングの握りつぶし箇所 🟡(記録のみ)
- **根拠**: 多数の `catch` が `logger.debug`/`console.debug` で握りつぶす(例: Cloudflare 検出、contentScriptReady)。一部は MV3 制約上の意図的な無視と判断できる
- **改善案**: 今回は修正しない。Phase 2 のテスト整備時に「意図的な無視」とコメントが必要な箇所を報告書に列挙する

---

## 8. Implementation Phases

> 各 Phase は独立コミット。Phase N が green でない限り N+1 に進まない。

### Phase 0: 現状確認(変更なし)
1. `git status` / `git log` 確認。未コミット変更があれば報告して停止
2. ブランチ `refactor/safety-net-and-cleanup` を作成
3. Section 6 の Baseline Commands を実行し `plan/refactor-baseline.md` に記録

### Phase 1: 検証基盤を正直にする(D1)
1. package.json から存在しないスクリプト参照(`project*`, `test:phase*`, `dashboard*`, `sync*`)を削除
2. `tests/setup.js` を新規作成(jest-chrome による chrome API モックの最低限セットアップ)
3. `npm test` が(テスト0件でも)エラー終了しないことを確認(`--passWithNoTests` を test スクリプトに付与してよい)
4. 検証: `npm test` green、拡張のランタイムに変更がないこと(src/ 無変更)

### Phase 2: 安全網(特性テスト)を作る(D2)
1. `tests/unit/` を作成し、D2 列挙の純粋関数に対する特性テストを追加する
2. 重要: background.js は importScripts 前提で module export がない。**本体を書き換えずに**テストするため、`tests/helpers/load-background-functions.js` のような「ファイルを読み込み、対象関数を `new Function`/vm で評価して取り出す」ヘルパーを作る方式を第一候補とする。これが過度に複雑になる場合のみ、Phase 5 ①(関数のファイル分割)を先に行い、その分割ファイルを直接テストする方式へ切り替えてよい(切替判断は報告に明記)
3. 期待値は現実装の出力をそのまま固定する。仕様疑義が出たら Stop And Ask
4. 最低カバー対象: `diffStockProductUrls`、`normalizeStockProductUrl`、`extractSiteInfoFromAlarm`、`extractSiteIdFromAlarm`、`getSiteAlarmName`、`getSchedulesFromSite`、`resolveScheduleWindowSettings`、`normalizeScheduleTime`、`buildAeonStockDownloadPath`、`extractKeywordFromUrl`、`formatJstStockTimestamp`、`formatJstTimestampReadable`、content.js の `normalizeText`
5. 検証: `npm test` green

### Phase 3: 明らかに安全な整理(D3, D10, D11)
1. Index.md / repository-structure.md / architecture.md を実態に追従修正(事実のみ。仕様記述は変えない)
2. `src/config/README.md` にバックアップ運用の正を追記
3. pattern3-fix.js: **質問Q2 の回答が「削除可」の場合のみ**削除(回答前なら本 Phase では触れない)
4. 検証: Section 3 のうち npm test + 拡張ロード確認

### Phase 4: ログの限定的整理(D8)
1. background.js / popup.js の `🔵 [DEBUG]` 等、明確に一時デバッグと判る console.log のみ `logger.debug` へ置換(popup.js に logger がない場合は popup 側は対象外とし報告のみ)
2. `shouldSuppressLog` のフィルタ文字列と衝突しないことを置換ごとに確認
3. 1コミットあたり置換 30 箇所以内に分割
4. 検証: npm test + 実機 SW ログ確認(可能なら)

### Phase 5: 構造整理(挙動不変のみ)(D5 ①②, D12 の移動)
1. **①関数移設**: 純粋関数群を `src/background/lib/scheduleUtils.js` / `stockDiffUtils.js` / `downloadPathUtils.js` / `xlsxFallback.js` 等に移し、background.js 冒頭の `importScripts` に追加。関数名・シグネチャ・実装は一切変更しない(カット&ペーストのみ)。importScripts の読み込み順依存(logger 参照等)に注意し、グローバル参照が壊れないことを確認
2. **②case 抽出**: onMessage switch の各 case 本体を `handleStartMonitoring(request, sendResponse)` 形式の名前付き関数へ抽出(同一ファイル内、ロジック改変なし)。1コミット = 1〜3 ケース
3. Phase 2 のテストを分割後ファイル直読みに切り替え(ヘルパー経由をやめられる)
4. 検証: Section 3 全項目(実機の系統C手動テスト含む。不可なら人間向け手順を提示)

### Phase 6: 提案書の作成(実装しない)(D4, D6, D7, D9, D12, D13)
`plan/docs/refactor-proposals.md` を新規作成し、以下を設計案として記述する(コード変更なし):
- 系統B→C への片寄せ設計(storage 移行手順、popup UI 影響、ロールバック手順つき)
- 系統A の chrome.alarms 移行 or 廃止の比較
- content_scripts 登録削除の影響評価
- web_accessible_resources 削除案
- XLSX フォールバック撤去 or 維持の判断材料
- webhook ローテーション手順
各案に「メリット / リスク / 検証方法 / 必要な人間判断」を付す(decisions.md の様式に倣う)

### Phase 7: 仕上げ
1. tasklist 相当の進捗を最終確認し、全 Phase の検証結果を揃える
2. PRD 影響の有無を確認(本リファクタは挙動不変のため原則なし。ドキュメント追従修正は Phase 3 で実施済み)
3. Reporting Format(Section 10)に従い完了報告を作成

---

## 9. Verification Requirements

- 各 Phase 末: `npm test`、`git diff --stat`、拡張ロード時の SW コンソール確認(可能な場合)
- Phase 5 完了時: 系統Cの実機手動テスト(`scripts/set-test-times.js` + `tests/docs/scheduled-stock-diff-detection-verification.md` + `docs/複数サイト通知先分離の手動テスト手順.md`)を実施、不可能なら人間実施用チェックリストを出力
- 回帰判定基準: ダウンロードされるファイルのパス・命名・内容形式、storage キー構造、外部通知 payload が変更前と同一であること
- いかなる Phase でも「テストを通すために本体の挙動を変える」ことを禁止。テストが現挙動と食い違ったらテスト側を直すか Stop And Ask

---

## 10. Reporting Format

各 Phase 完了時に以下を報告する。

```
## Phase N 報告
- 変更ファイルと diff 行数:
- 実施した検証コマンドと結果(コピペ):
- 挙動不変の根拠:
- 発見した懸念・Stop And Ask 事項:
- 次 Phase へ進む可否:
```

最終報告には、最後に実行した全コマンドとその結果、未実施の手動テスト一覧(人間向け手順つき)、Phase 6 提案書へのリンクを含める。

---

## 11. Out-of-scope Items(本タスクで実装しないもの)

- 系統A(レガシー監視)の chrome.alarms 移行・monitoringLogic 重複統合(提案のみ)
- 系統B/C の統合・storage キー再設計(提案のみ)
- popup.js の本格分割・UI 改修
- manifest.json の変更(permissions、content_scripts、web_accessible_resources)
- `scheduled-watch-sites.json` の chrome.storage 化などスキーマ/読込方式の変更
- TypeScript 化、ビルドシステム導入、ESLint/Prettier 導入
- MonitoringConfigManager の移行・バックアップ・healthCheck ロジックの変更
- Excel 入出力機能の変更
- 新機能の追加全般
- node_modules / backup / download / 参考 配下への一切の変更
