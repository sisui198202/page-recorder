# tasklist — baseline 取得時にスクショ＋ログを残す

**承認:** [x] ユーザー承認済み（2026-05-29）

## 🎯 目的

design.md に基づき、定時監視の baseline 証跡（PNG / HTML / txt）保存と検知ログのパス統一を実装する。

---

## 📋 進め方ルール

- Phase 単位で進める（実装 → 手動テスト）
- 完了した項目は `[x]` に更新
- design.md にない内容は実装しない

---

## Phase 1: パス・ログユーティリティ

### 実装

- [x] `formatJstStockTimestamp(date)` を追加（JST、`yyMMdd` / `yyMMdd-hhmmss` を返す）
- [x] `buildAeonStockDownloadPath(kind, date, ext)` を追加（`download/aeon/stock/{yyMMdd}/{kind}_{yyMMdd-hhmmss}.{ext}`）
- [x] `buildBaselineLogText(snapshot, session)` を追加（design の baseline txt 形式、`logType: baseline`）

### 手動テスト

- [x] SW コンソールで `formatJstStockTimestamp(new Date())` の戻り値が JST・2桁年であることを確認（`self.formatJstStockTimestamp` を公開済み。ロジック検証: `260601` / `260601-115700` 形式）

---

## Phase 2: baseline 証跡保存

### 実装

- [x] `saveScheduledStockBaselineArtifacts(session, snapshot, tabId)` を追加
- [x] `scheduledStockWatchSession` に `baselineArtifactsSaved: false` を追加
- [x] `runStockWatchTick` で初回 snapshot 成功後に baseline 保存 + フラグ更新

### 手動テスト

- [x] §2.5 停止 → アラームクリア → `startScheduledStockWatch()`
- [x] `download/aeon/stock/{yyMMdd}/baseline_*.{png,html,txt}` が **1セット** 保存される
- [x] 2回目以降の tick では baseline ファイルが **増えない**
- [x] popup「スクリーンショット」OFF でも baseline 3ファイルが保存される

---

## Phase 3: 検知ログのパス・形式統一

### 実装

- [x] `buildStockLogText` を design の detected 形式に更新
- [x] `saveScheduledStockLog` の保存先を `download/aeon/stock/{yyMMdd}/detected_*.txt` に変更
- [x] `scheduledStockLogs`（storage）への push は維持

### 手動テスト

- [x] §3.2 baseline 1件減 → 監視開始 → 検知成功
- [x] **同じ `{yyMMdd}` フォルダ** に `detected_*.txt` が保存される
- [x] baseline txt と detected txt で比較可能
- [x] discord 通知・`newUrls` 検知が従来どおり動作する

---

## Phase 4: 手順書・参照更新

### 実装

- [x] `tests/aeon-scheduled-stock-check-sw-manual.md` に §1.5 保存先確認手順を追記
- [x] `tests/memo.md` の stock_logs パス記述を更新

### 手動テスト

- [x] 手順書のパス例が requirements / design と一致している

---

## Phase 5: 統合確認

### 手動テスト

- [x] 本番想定: 監視開始のみ（検知なし）→ baseline 3ファイルのみ
- [x] 差分検知テスト → baseline + detected が同日フォルダに共存
- [x] 既存: 監視ウィンドウ二重開始防止・1一覧タブが維持される
- [x] `node --check src/background/background.js` が通る

---

## 対象外

- Phase DOM検証 / Playwright / Chrome拡張連携（popup 新規 UI）— 本タスクでは新規セレクタ・popup 変更なし

---

## 📝 完了条件

- [x] design.md の変更対象がすべて実装済み
- [x] requirements の受け入れ条件を満たす
- [x] 各 Phase の手動テスト完了
- [x] tasklist.md と実装状態が一致
- [x] ユーザー確認済み
