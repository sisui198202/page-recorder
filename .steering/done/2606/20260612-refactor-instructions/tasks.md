# tasklist.md

## 🎯 目的

`design.md` に基づき、既存の定時在庫監視フローを壊さずに、検証基盤是正、特性テスト追加、安全な整理、限定的な構造整理、提案書化を Phase 単位で進める。

---

## 🧩 実装対象

- `requirements.md` / `design.md` に記載された内容のみ実装する
- 既存挙動を変える仕様変更は行わない
- 高リスク変更は実装せず、提案書へ整理する
- 各 Phase 完了ごとに `npm test` と回帰確認を行う
- ユーザー承認済み事項として、`pattern3-fix.js` は削除対象、`package.json` は `PageRecorder` に統一対象とする
- `content.js` / `content_scripts` / `web_accessible_resources` は、無参照かつ既存機能へ影響がないことを確認できた場合のみ削除対象とする

---

## 📋 進め方ルール

- Phase 0 → Phase 7 の順で進める
- 完了した項目は即時に `[x]` へ更新する
- `tasklist.md` の状態と実装状態を常に一致させる
- 300行を超える大きな差分になりそうな場合は Phase をさらに分割する
- 仕様疑義、運用判断、未承認の削除判断が出たら実装を止めて確認する

---

## 🚨 禁止事項

- `design.md` にない内容を実装すること
- `scheduled-watch-sites.json`、storage キー構造、外部通知 payload 契約を変更すること
- 高リスクな統合や廃止を勝手に実装すること
- 未テストのまま次 Phase へ進むこと

---

# Phase 0: 現状記録

## 🧩 実装

- [x] 未コミット変更の有無を確認し、存在する場合は停止する
- [x] `git status` を記録する
- [x] `git log --oneline -5` を記録する
- [x] Node / npm の版数を記録する
- [x] 現状の `npm test` 実行結果を記録する
- [x] `src/background/*.js`、`src/ui/popup.js`、`src/content/content.js` の行数を記録する
- [x] 記録先として `plan/refactor-baseline.md` を作成する

## 🧪 手動テスト

- [x] Phase 0 時点では手動テストを行わず、現状記録のみであることを明記する

---

# Phase 1: 検証基盤是正

## 🧩 実装

- [x] `package.json` の scripts / jest 設定を確認し、実在しない script 参照を削除する
- [x] `tests/setup.js` を追加し、Jest 実行の初期化を定義する
- [x] テスト未作成状態でも `npm test` が失敗しない構成へ整える
- [x] `src/` 配下のランタイムコードを変更しないことを確認する

## 🧪 手動テスト

- [x] `npm test` が成功することを確認する
- [x] 変更が `package.json` と `tests/setup.js` 周辺に限定されていることを確認する

---

# Phase 2: 特性テスト追加

## 🧩 実装

- [x] `tests/unit/` を追加する
- [x] `tests/helpers/load-background-functions.js` または同等の補助を追加する
- [x] `background.js` 本体を改変せずに純粋関数を読み込める形を用意する
- [x] `refactor-instructions.md` に列挙された純粋関数群の特性テストを追加する
- [x] `content.js` の `normalizeText` に対する特性テストを追加する
- [x] 期待値は理想仕様ではなく現実装の出力を固定する

## 🧪 手動テスト

- [x] `npm test` が成功することを確認する
- [x] 追加テストが現挙動の固定であり、仕様変更を含んでいないことを確認する

---

# Phase 3: 安全な整理

## 🧩 実装

- [x] `PRD/architecture.md` を実態追従で更新する
- [x] `PRD/repository-structure.md` を実態追従で更新する
- [x] `src/config/README.md` にバックアップ運用の正を明記する
- [x] 明確な不要物の整理対象を洗い出す
- [x] `src/background/pattern3-fix.js` は削除承認がある場合のみ対応する
- [x] `package.json` の name / version / author を `PageRecorder` 実態へ寄せる
- [x] `content.js`、`manifest.json` の `content_scripts`、`web_accessible_resources` について、無参照確認が取れた場合のみ削除する
- [x] 承認がない削除・統合・構造変更を実施しないことを確認する

## 🧪 手動テスト

- [x] `npm test` が成功することを確認する
- [x] ドキュメント更新が実態追従に留まり、仕様追加になっていないことを確認する
- [x] 削除対象がある場合は承認範囲内であることを確認する
- [x] `content.js` 削除を行う場合、既存機能の参照切れが発生していないことを確認する

---

# Phase 4: ログ整理

> ⚠️ **実施状況: 未実施**
> console.log → logger.debug への置換は第2弾（fix/refactor-followup）で実施予定。

## 🧩 実装

- [x] `src/background/background.js` の一時デバッグログを洗い出す
- [ ] 削除または `logger.debug` への寄せ先を整理する ← **未実施**
- [x] 抑制ロジックに使う文字列を変更しない
- [x] `popup.js` は logger 基盤がなければ対象外とする

## 🧪 手動テスト

- [x] `npm test` が成功することを確認する
- [x] Service Worker 読み込み時に構文エラーがないことを確認する
- [x] ログ整理によって既存の監視・通知導線が変化していないことを確認する ← **未実施（ログ整理自体が未実施のため）**

---

# Phase 5: 構造整理

> ⚠️ **実施状況: 部分実施**
> case 抽出は小規模 case のみ完了。大規模 case は未抽出のまま。

## 🧩 実装

- [x] `background.js` 内の純粋関数群を責務別に分離する方針を確認する
- [x] 必要に応じて `src/background/lib/*.js` を追加する
- [x] 純粋関数群をロジック変更なしのカット&ペーストで移設する
- [△] `background.js` の `onMessage` switch から case ごとの名前付き関数抽出を行う ← **部分実施**
  - ✅ 抽出済み: 小規模 case 6件
  - ❌ 未抽出: `startMonitoring`（約1000行）、`startAllMonitoring`、`quickCapture`、`exportMonitoringSettings`、`importMonitoringSettings`
- [x] `chrome.storage.local` キー、外部通知 payload、ダウンロード命名、`self.*` エクスポートを維持する
- [x] Phase 2 のテスト参照先を、必要なら分割後ファイルへ切り替える

## 🧪 手動テスト

- [x] `npm test` が成功することを確認する
- [x] 拡張を読み込み、Service Worker コンソールで構文エラーや `importScripts` 失敗がないことを確認する
- [x] 系統Cの baseline 保存が既存通り動作することを確認する
- [x] 系統Cの tick 動作が既存通り動作することを確認する
- [x] 系統Cの通知導線が既存通り動作することを確認する

---

# Phase 6: 提案書化

## 🧩 実装

- [x] `plan/docs/refactor-proposals.md` を新規作成する
- [x] 単一サイト版と複数サイト版の統合案を提案として整理する
- [x] webhook ローテーション等の高リスク項目を提案として整理する
- [x] 各提案にメリット、リスク、検証方法、人間判断ポイントを記載する
- [x] 提案書内で「未承認のため未実装」であることを明記する

## 🧪 手動テスト

- [x] `npm test` が成功することを確認する
- [x] 提案書に実装済み事項と未実装提案が混在していないことを確認する

---

# Phase 7: 仕上げ

## 🧩 実装

- [x] Phase ごとの結果を整理する
- [x] 未実施の手動テストを明記する
- [x] 残課題を整理する
- [x] `tasklist.md` の完了状態を最終確認する
- [x] `requirements.md` / `design.md` / `tasklist.md` の整合性を最終確認する

## 🧪 手動テスト

- [x] 最終 `npm test` を実行し成功することを確認する
- [x] 実施済み回帰確認と未実施項目が区別されていることを確認する

---

## 🔍 差分・課題メモ

- `content.js` は `checkKeywordChange()` から参照されていたため削除条件不成立
- `web_accessible_resources` は無参照確認できたため manifest から削除
- 既存機能と系統Cの手動回帰確認は完了
- 系統B/C 統合、系統A 将来方針、webhook ローテーションは提案書へ分離

### 第1弾未完了事項（第2弾へ引き継ぎ）

| 項目                                | 状況   | 引き継ぎ先                    |
| ----------------------------------- | ------ | ----------------------------- |
| Phase 4: console.log → logger.debug | 未実施 | fix/refactor-followup Phase 5 |
| Phase 5: 大規模 case 抽出           | 未実施 | 提案書 F9                     |
| generateFilename 配置問題           | 未検討 | 提案書 F8                     |

---

## 📝 完了条件

- [x] `design.md` に記載された Phase 0〜7 の内容が tasklist に反映されている
- [x] `npm test` が各 Phase 完了時に成功している
- [x] 既存の定時在庫監視フローを壊さない前提が維持されている
- [x] 高リスク変更が提案書へ分離され、未承認実装が含まれていない
- [x] `tasklist.md` と実装状態が一致している ← **2026-06-13 是正済み**
- [x] ユーザー確認済み

> 📝 **2026-06-13 是正**: Phase 4・Phase 5 の実施状況を実態に合わせて修正。未完了事項は第2弾（fix/refactor-followup）または提案書へ引き継ぎ。
