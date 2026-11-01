# tasklist.md

## 🎯 目的

design.md に基づいた実装タスクを管理する。
通常開発を基本とし、DOM操作・Playwright・Chrome拡張が関わる場合のみ条件付きPhaseを使用する。

---

## 🧩 実装対象

* design.md に記載された内容のみ実装する
* 未記載仕様は実装しない
* requirements.md / design.md / tasklist.md の整合性を保つ

---

## 📋 進め方ルール

* Phase単位で進める
* 各Phaseごとに「実装」と「手動テスト」をセットで完了させる
* 完了した項目は即時に `[x]` に更新する
* tasklist.md の状態と実装状態を常に一致させる
* 条件付きPhaseは、該当する場合のみ使用する
* 該当しない条件付きPhaseは削除または「対象外」と明記する

---

## 🚨 禁止事項

* design.md にない内容を実装すること
* 未テストのまま次Phaseへ進むこと
* 複数Phaseをまとめて実装すること
* 未完了タスクを完了扱いにすること
* DOM系作業で未検証セレクタを使うこと
* 拡張連携があるのに連携確認を省略すること

---

# Phase 1: 事前確認

## 🧩 実装

* [x] requirements.md の内容を確認する（I/O単一化、Facade委譲、正規化は別タスク）
* [x] design.md の内容を確認する（MCM単一I/O、initポイント1箇所、legacy経路廃止）
* [x] 変更対象ファイルを確認する（`src/background/background.js`, `src/background/monitoringConfigManager.js`）
* [x] `background.js` 内の設定I/O経路を一覧化する
  * [x] `currentConfig`
  * [x] `loadConfig/saveConfig`
  * [x] `migrateStorageKeys`
  * [x] `debugStorageContents`
  * [x] `validateDataIntegrity`
  * [x] `configManager` の各メソッド（`load/save/changeMode/add/remove/update/getStatus/import/export`）
* [x] `MonitoringConfigManager` 側のI/O経路を確認する（`loadConfig/saveConfig/migrateStorageKey/initialize`）
* [x] 完了条件（受け入れ条件）を確認する

## 🧪 手動テスト

* [x] 現状の動作を確認する
* [x] 変更前の挙動を確認する
* [x] 必要に応じて比較用メモを残す

---

# Phase 2: DOM検証（対象外）

> 本タスクは設定I/O統合のため、DOM検証は対象外

## 🧩 実装

* [x] （対象外）

## 🧪 手動テスト

* [x] （対象外）

---

# Phase 3: 単体実装

## 🧩 実装

* [x] `background.js` の `configManager` を互換Facadeとして維持しつつ、内部を `MonitoringConfigManager` へ全面委譲する
  * [x] `configManager.loadConfig/saveConfig/changeMode/addMonitoringTarget/removeMonitoringTarget/updateMonitoringTarget/getStatus`
  * [x] Excel Import/Export 経路（存在する場合）も同様に委譲する
* [x] `background.js` 内 legacy 設定I/O（`currentConfig/loadConfig/saveConfig/migrateStorageKeys`）を廃止または到達不能にする
  * [x] `chrome.storage.local.get/set/remove` の監視設定用途は MCM に集約する
  * [x] `monitoringConfig` 旧キー直読みのフォールバック経路を除去する（MCMの移行処理に一本化）
* [x] 起動時の `monitoringConfigManager.initialize()` 実行地点を1箇所に固定する（多重初期化を避ける）
* [x] `debugStorageContents/validateDataIntegrity` は「デバッグ専用」として、統一後の単一ソース（`monitoring_config`）を前提に整理する（必要なら条件分岐配下へ隔離する）

## 🧪 手動テスト

* [x] 旧キーのみ/新キーのみ/両方 の3状態で起動し、`monitoring_config` に集約される
* [x] モード切替が反映される（SW Console CRUD で確認）
* [x] 監視対象の追加/更新/削除が反映される（複数回繰り返しても状態がブレない）
* [x] Excel Import/Export（利用している場合）が動作する

---

# Phase 4: 動的DOM確認（対象外）

> 本タスクは設定I/O統合のため、動的DOM確認は対象外

## 🧩 実装

* [x] （対象外）

## 🧪 手動テスト

* [x] （対象外）

---

# Phase 5: Chrome拡張連携確認（該当時のみ）

> content script / background / popup / options / messaging が関わる場合のみ使用する

## 🧩 実装

* [x] popup/options 等からのメッセージ経路で `configManager` API を呼ぶ箇所がある場合、挙動が変わらないことを確認する

## 🧪 手動テスト

* [x] 拡張機能が正しく読み込まれる
* [x] UI操作（該当する場合）から設定変更が行え、反映される（Export/Import/Delete）

---

# Phase 6: 統合確認

## 🧩 実装

* [x] 全体フローを確認する
* [x] 監視設定に関する `chrome.storage.local.*` 直アクセスが `background.js` に残っていないことを確認する（MCMへ集約）
* [x] 不要コード / 不要ログを削除する（ただしデバッグ用途は条件分岐下に残す選択も可）
* [x] docs更新要否を確認する（本タスクでは PRD 更新不要）
* [x] decisions.md 記録要否を確認する（任意・未記録）

## 🧪 手動テスト

* [x] 一連の実行フローが正常動作する
* [x] 既存機能に影響がない
* [x] UI / データ / 外部連携の整合性が取れている
* [x] 境界ケースでも破綻しない

---

# Phase 7: 仕上げ

## 🧩 実装

* [x] tasklist.md の完了状態を最終確認する
* [x] design.md との差分がないことを確認する
* [x] requirements.md とのズレがないことを確認する
* [x] 必要に応じて docs / decisions.md を更新する（本タスクでは未実施）

## 🧪 手動テスト

* [x] 最終確認を実施する
* [x] 完了条件を満たしていることを確認する

---

## 🔍 差分・課題メモ

* `ensureMonitoringConfigManager()` で init を一元化。legacy の `migrateStorageKeys` / `validateDataIntegrity` は削除
* popup 起動時の `unifyDataStructure` は既存挙動として残存（本タスクスコープ外）
* フィールド正規化の本格対応は別タスク推奨

---

## 📝 完了条件

* [x] design.md に記載された内容をすべて実装済み
* [x] 各Phaseの実装・手動テスト完了
* [x] 条件付きPhaseが必要な場合は実施済み
* [x] tasklist.md と実装状態が一致している
* [x] 未解決事項は decisions.md または未確定事項に反映済み
* [x] ユーザー確認済み

---
