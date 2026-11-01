# tasks.md

## 🎯 目的

design.md に基づいた実装タスクを管理する。
EC監視UI機能（ec-sites.json連携、サイトトグル、自動補完、URL登録）を実装する。

---

## 🧩 実装対象

- design.md に記載された内容のみ実装する
- 未記載仕様は実装しない
- requirements.md / design.md / tasks.md の整合性を保つ

---

## ✅ チェック状態の定義

- [ ] 未着手。今回タスクで対応予定の項目
- [~] 実装済み。実装は完了したが、確認が未完了の項目
- [x] 完了。対象項目について、実装と確認の両方が完了した項目
- [-] 保留。このタスクでは今回対応しないが、再検討・対応余地がある項目
- [/] 却下。今回タスクでは不採用確定の項目

---

## 📋 進め方ルール

- Phase単位で進める
- 各項目は、実行した直後に状態を更新する
- 各Phaseごとに「実装」と「確認」をセットで完了させる
- 実装だけ完了した項目は `[~]` に更新する
- 実装と確認の両方が完了した項目だけを `[x]` に更新する

---

# Phase 1: 事前確認

## 🧩 実装

- [x] requirements.md の要件を確認する
  - FR-1: ec-sites.json連携基盤
  - FR-2: サイト選択UI
  - FR-3: セレクタ・キーワード自動補完
  - FR-4: URL登録機能

- [x] design.md の設計内容を確認する
  - loadEcSites(), getEcSiteById() の設計
  - renderSiteToggles(), handleSiteToggle() の設計
  - autoFillFromEcSites() の設計
  - URL登録関連関数の設計

- [x] 変更対象ファイルを確認する
  - 新規: src/config/ec-sites.json
  - 修正: src/ui/popup.html, src/ui/popup.js
  - 確認: manifest.json (web_accessible_resources)

- [x] 既存popup.jsの構造を確認する
  - 既存の入力欄ID（monitorSelector, monitorKeyword）
  - セクション追加位置の確認

## 🧪 確認

- [x] 現状のpopup.htmlのセクション構造を把握する
- [x] 既存の入力欄要素が存在することを確認する
- [x] ec-sites-master.json の構造を確認する

---

# Phase 2: DOM検証

> [/] 新規UIセクション追加のため、既存ページのDOM取得は不要

---

# Phase 3: 単体実装

## 🧩 実装

### 3.1 ec-sites.json準備

- [x] shared/ec-sites-master.jsonからsrc/config/ec-sites.jsonへ同期
  - sync-ec-sites.js を実行

- [x] manifest.json の web_accessible_resources を確認
  - ec-sites.jsonが必要な場合は追加

### 3.2 popup.js ec-sites.json読込機能（FR-1）

- [x] ecSitesCacheグローバル変数を追加
- [x] loadEcSites()関数を追加
- [x] getEcSiteById()関数を追加

### 3.3 popup.html サイトトグルセクション追加（FR-2）

- [x] EC監視サイトセクションのHTMLを追加
  - id="ecSiteSection"
  - id="siteTogglesContainer"

### 3.4 popup.js サイトトグル機能（FR-2）

- [x] renderSiteToggles()関数を追加
- [x] handleSiteToggle()関数を追加
- [x] DOMContentLoadedでrenderSiteToggles()を呼び出し

### 3.5 popup.js 自動補完機能（FR-3）

- [x] checkAutoFill()関数を追加
- [x] autoFillFromEcSites()関数を追加

### 3.6 popup.html URL登録セクション追加（FR-4）

- [x] URL登録セクションのHTMLを追加
  - id="urlRegistrationSection"
  - id="urlSiteSelect"
  - id="urlInput"
  - id="addUrlBtn"
  - id="registeredUrlList"

### 3.7 popup.js URL登録機能（FR-4）

- [x] renderSiteSelect()関数を追加
- [x] handleAddUrl()関数を追加
- [x] renderRegisteredUrls()関数を追加
- [x] handleDeleteUrl()関数を追加
- [x] truncateUrl()関数を追加
- [x] イベントリスナー登録

### 3.8 popup.html 内スタイル追加

- [x] .site-toggle-item スタイル追加
- [x] .toggle-switch / .toggle-slider スタイル追加
- [x] .url-register-form スタイル追加
- [x] .url-item / .btn-delete スタイル追加

## 🧪 確認

- [x] ec-sites.jsonが正しく配置されている
- [x] popup.htmlに構文エラーがない
- [x] popup.jsに構文エラーがない
- [x] popup.html 内 style に構文エラーがない

---

# Phase 4: 動的DOM確認

> [/] 動的表示・遷移後取得は不要（popup内で完結）

---

# Phase 5: Chrome拡張連携確認

## 🧩 実装

- [x] chrome.runtime.getURL()でec-sites.json読込実装を確認
- [x] chrome.storage.local.get/set動作実装を確認
  - ecSiteEnabled キー
  - registeredUrls キー

## 🧪 確認

- [x] 拡張機能が正しく読み込まれる
- [x] popupが正常に開く
- [x] ec-sites.jsonからサイト一覧が表示される
- [x] storage保存/読込が正常に動作する

---

# Phase 6: 統合確認

## 🧩 実装

- [x] 不要なconsole.logを整理する
- [x] コメントを整理する

## 🧪 確認

### サイトトグル確認

- [x] popup開く → EC監視サイトセクションにサイト一覧が表示される
- [x] サイトをON → popup再表示 → ON状態が維持されている
- [x] 複数サイトのON/OFF切替が正常に動作する

### 自動補完確認

- [x] 単一サイトON → セレクタ・キーワード入力欄に値が自動入力される
- [x] 複数サイトON → セレクタ・キーワード入力欄が空欄になる
- [x] 0サイトON → セレクタ・キーワード入力欄が空欄になる

### UIレイアウト確認

- [x] 単一監視 UI のセクション順が `監視対象 → EC監視サイト → 単一監視設定 → 監視URL登録 → ダウンロード内容` になっている
- [x] `ログレベル` が popup 全体の最下部にあり、ヘッダーにはステータス表示のみ残っている
- [x] この変更が UX 上の並び順整理のみで、保存仕様・監視ロジック変更を伴っていない
- [x] 単一監視設定 が 1 つの親セクションとしてまとまっている
- [x] 監視条件 → 取得条件 → 停止条件 → 定時差分検知 の順で小見出し表示される
- [x] EC監視サイト と 監視URL登録 が独立セクションのまま表示される
- [x] EC監視サイト一覧が 2 列で表示される

### URL登録確認

- [x] サイト選択ドロップダウンにサイト一覧が表示される
- [x] サイト選択 + URL入力 + 追加 → 一覧に表示される
- [x] 重複URL追加 → アラート表示
- [x] 削除ボタン → 一覧から消える

### 既存機能共存確認

- [x] 単一URL監視モードが正常動作する
- [x] 既存の設定保存・読込が正常動作する
- [x] popup 再オープン後も 0件ON/複数件ON では空欄、1件ON では該当サイト値が入る
- [x] 定時差分検知 UI が崩れていない

---

# Phase 7: 仕上げ

## 🧩 実装

- [x] tasks.md の完了状態を最終確認する
- [x] design.md との差分がないことを確認する
- [x] requirements.md とのズレがないことを確認する

## 🧪 確認

- [x] 全要件（FR-1〜FR-4）を満たしている
- [x] 完了条件を満たしている

---

## 🔍 差分・課題メモ

- `popup.css` は使わず、EC監視UI用スタイルは `src/ui/popup.html` のインライン `<style>` に実装されている
- 見出し階層の統合は UI 整理目的であり、監視ロジックや保存仕様の変更は含まない
- `manifest.json` では `web_accessible_resources` に `src/config/ec-sites.json` が追加済みで、`popup.js` は `chrome.runtime.getURL()` 経由でこれを読み込む実装になっている
- 今回の steering では EC監視UI の整理のみを扱い、`src/background/background.js` 側の 2026-08-27 時点の検知改善は反映対象に含めない

---

## 📝 完了条件

- [x] design.md に記載された今回対象範囲をすべて実装済み
- [x] 各Phaseの実装・確認について、対象項目は完了済み
- [x] 今回対応しない項目は `[-]` または `[/]` として整理済み
- [x] `tasks.md` と実装・確認状態が一致している
- [x] 未解決事項は decisions.md または未確定事項に反映済み
- [x] ユーザー確認済み
