# requirements.md

## 🎯 目的

PageRecorderにAutoCartAgentのEC監視UI機能を移植し、ec-sites.json定義サイトの監視設定を効率化する。

---

## 🎯 プロダクト概要

- **解決する課題**: 現状はセレクタ・キーワードを手動入力する必要があり、ECサイト監視設定に手間がかかる
- **対象ユーザー**: PageRecorderを使用してECサイトの在庫監視を行うユーザー
- **成功指標**: ec-sites.json定義サイトの監視設定がサイト選択だけで完了する

---

## 📌 背景

- PageRecorderは「在庫監視と外部拡張への通知」を担当する拡張機能
- URL判明系のECサイト監視も行うため、ec-sites.json連携が必要
- AutoCartAgentにはEC監視UI機能が既に実装されており、これを移植することで効率化が可能
- 起点: `plan/docs/ec-monitoring-ui-enhancement.md`

---

## アクティビティ図（必要な場合のみ）

> 後続のdesign.mdフェーズで必要に応じて追加する

---

## 👤 ユーザーストーリー

### US-1: セレクタ自動補完

- as a ECサイト監視ユーザー
- I want ec-sites.jsonに定義されたセレクタが自動入力される
- so that 手動入力の手間を省ける

### US-2: サイト選択UI

- as a ECサイト監視ユーザー
- I want ec-sites.json登録サイトを一覧から選択できる
- so that どのサイトを監視するか直感的に選べる

### US-3: URL登録（サイト選択から）

- as a ECサイト監視ユーザー
- I want サイト選択ドロップダウンからURLを登録できる
- so that サイトとURLを紐づけて管理できる

---

## 🧩 機能要件

### FR-1: ec-sites.json連携基盤

- config-loader.js（または同等機能）の追加
- popup.jsでのec-sites.json読込処理
- サイト一覧取得・サイト設定取得のヘルパー関数

### FR-2: サイト選択UI

- popup.htmlにサイトトグルセクションを追加
- サイトトグルの動的生成
- サイトON/OFF状態のstorage保存

### FR-3: セレクタ・キーワード自動補完

- 単一サイトON検出ロジック
- autoFillMonitorSettings()相当の関数
- 既存のセレクタ・キーワード入力欄への自動入力

### FR-4: URL登録（サイト選択から）

- popup.htmlに監視URLセクションを追加
- サイト選択ドロップダウン + URL入力フォーム
- 登録済みURL一覧表示・削除機能

---

## ⚙️ 非機能要件

- **パフォーマンス**: ec-sites.json読込は非同期で行い、UI表示を妨げない
- **保守性**: AutoCartAgentの実装を流用し、共通ロジックとして整理
- **一貫性**: AutoCartAgentのデザインパターン（トグルスイッチ等）を踏襲

---

## ✅ 受け入れ条件（Acceptance Criteria）

- [ ] ec-sites.json定義サイトがpopup上でサイトトグルとして表示される
- [ ] サイトトグルのON/OFF状態がstorage保存される
- [ ] 単一サイトON時にセレクタ・キーワードが自動補完される
- [ ] サイト選択からURLを登録できる
- [ ] 登録済みURLの一覧表示・削除ができる
- [ ] 既存機能（単一URL監視、複数URL監視、定時監視）との共存が確認される

---

## 🚫 スコープ外（Out of Scope）

- 認証情報管理（PageRecorderの責務外、ログイン/購入を行わない）
- AutoCartAgentとの設定同期（各拡張独立で管理）

## 🚧 制約事項

- popup.jsが1800行超のため、段階的に機能追加する
- ec-sites.jsonはshared/ec-sites-master.jsonが正本（sync-ec-sites.jsで同期）
- UIはAutoCartAgentのデザインパターンを踏襲し、既存UIとの違和感を最小化

---

## 🔍 影響範囲（Impact Analysis）

- **影響するファイル**:
  - src/popup.html
  - src/popup.js
  - src/popup.css
  - manifest.json（web_accessible_resources追加の可能性）
- **影響する機能**:
  - 単一URL監視モード（セレクタ入力欄に自動補完が追加）
  - 複数URL監視モード（URL登録UIの追加）
- **影響するユーザー操作**: 監視設定フロー

---

## ❓ 未確定事項

- ec-sites.jsonの読込方法（config-loader.js流用 or 新規実装）
- サイトトグルの配置場所（既存UIへの統合方法）
- Phase分割の詳細（plan/docs記載の5フェーズを踏襲するか）

---

## 📝 承認

- [x] ユーザー承認済み
