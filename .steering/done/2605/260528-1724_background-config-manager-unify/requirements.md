# requirements.md

## 🎯 目的

background 側の監視設定管理（読み書き・移行・状態同期）を **単一のI/O経路に集約**し、設定キー分裂や状態不一致が再発しにくい状態を作ることを目的とする。

---

## 📌 背景

* background 側に設定管理の経路が複数存在している可能性があり、どの経路で読み書きしたかによって状態がズレる可能性がある
* 旧キー（例: `monitoringConfig`）と新キー（例: `monitoring_config`）が併存していた経緯があり、移行・互換コードが点在している可能性がある
* 結果として、設定キー分裂やデータ構造の不整合が根本原因になっている可能性がある

---

## 👤 ユーザーストーリー

* as a 拡張機能利用者
* I want 監視設定が一貫した場所に保存・読み込みされるようにしたい
* so that モード切替や監視対象の追加/更新/削除が安定して反映される

* as a 開発者
* I want 設定I/Oの責務が1箇所に集約されている状態にしたい
* so that バグ調査時に参照箇所が分散せず、再発防止がしやすい

---

## 🧩 機能要件

* 設定の永続化（read/write）は、単一の管理層（例: `MonitoringConfigManager`）に集約される想定
* 旧キーから新キーへの移行が必要な場合、起動時などに冪等に実行される想定
* 設定の参照・更新API（例: `configManager` 相当）が存在する場合でも、内部では単一管理層へ委譲される想定

---

## ⚙️ 非機能要件

* 移行処理は繰り返し実行されても安全（冪等）であることが望ましい
* 既存ユーザーの保存データ（旧キーのみ/新キーのみ/両方）に対して破壊的変更を避けることが望ましい

---

## ✅ 受け入れ条件（Acceptance Criteria）

* [ ] background 側で設定の read/write/migrate 経路が複数存在しない（少なくとも主経路が1つに統一されている）
* [ ] 旧キーのみ/新キーのみ/両方 の状態から起動しても、設定が意図した形で `monitoring_config` に集約される
* [ ] モード切替・監視対象の追加/更新/削除・Excel Import/Export（該当する場合）が一貫した設定データを参照して動作する

---

## 🚫 スコープ外（Out of Scope）

* 監視機能そのものの仕様追加・変更（設定管理の統合に直接関係しないUI/機能拡張）
* popup/options/content 側の大幅な設計変更（必要が出た場合は別タスクで扱う可能性がある）


## 🚧 制約事項

* PRD / steering と矛盾する実装は行わない
* 未確定仕様は断定せず、必要なら decisions.md に残す

---

## 🔍 影響範囲（Impact Analysis）

* background: `src/background/background.js` 周辺の設定I/O経路（推測）
* background: `src/background/monitoringConfigManager.js` の設定I/O・移行処理（推測）
* 監視モード・監視対象管理・Excel入出力など、設定参照に依存する機能（推測）

---

## ❓ 未確定事項

* （確定済み）`configManager` は互換Facadeとして残し、内部は `MonitoringConfigManager` に委譲
* （確定済み）フィールド正規化（`detection_mode/keyword/selector`）の本格対応は別タスク

---

## 📝 承認

* [x] ユーザー承認済み
