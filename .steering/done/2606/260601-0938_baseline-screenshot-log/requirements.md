# requirements — baseline 取得時にスクショ＋ログを残す

## 🎯 目的

AEON 定時監視ウィンドウの **監視開始時刻**（`scheduleWindowStart` / `dailyStockCheck`）に、popup で指定した一覧 URL へ接続し、**毎日必ず** baseline 取得時点の証跡として次を残す。

- **スクリーンショット**（PNG）
- **HTML ソース**
- **在庫差分検知に必要なテキストログ**

入荷前後の運用で「その日の開始時点の一覧状態」と「検知成功時の状態」を **同じ形式・同じフォルダ構成** で比較し、今後の在庫検知の分析・障害調査に役立てる。

---

## 📌 背景

### 現状

- 定時監視（`startScheduledStockWatch`）は指定時刻に一覧タブを開き、`captureScheduledSnapshot` で URL 集合を取得して差分監視する（`.steering/260529-aeon-stock-watch-window/`）。
- baseline は `scheduledStockSnapshots`（storage）に `count` / `urls` / `checkedAt` として保持される。
- **検知成功時のみ** `scheduledStockLogs` と `PageRecorder/stock_logs/stock_log_*.txt` が保存される（パス・形式が baseline と揃っていない）。
- popup の「スクリーンショット」設定は **通常 URL 監視** 向け。定時監視 baseline 取得には未接続。

### 課題

- 指定時刻の baseline 取得時に、**ファイルとして残るスクショ・ソース・ログが無い** と、障害調査・運用確認がしづらい。
- 検知が起きない日でも、「開始時点の一覧状態」の記録が必要。
- baseline ログと検知ログが別形式・別パスだと、日次比較がしにくい。

---

## 👤 ユーザーストーリー

- **As a** 拡張機能利用者
- **I want** 監視が開始された日は毎回、一覧 URL 接続直後の baseline としてスクショ・ソース・ログを保存したい
- **So that** その日の検知ログと並べて、在庫検知の精度や AEON 一覧の変化を後から確認できる

---

## 🧩 機能要件

### FR-1 毎日 baseline 証跡の保存

1. popup で **毎日定時実行** が ON で、**監視開始時刻** にセッションが開始された **毎日**、baseline 証跡を **1回** 保存する（storage が空かどうかに依存しない）。
2. 保存タイミング: 監視セッション開始後、**初回 `captureScheduledSnapshot` が成功した直後**（初回 tick または開始処理内の初回取得。design 参照）。
3. 保存対象:
   - 一覧ページの **スクリーンショット**（PNG）
   - 一覧ページの **HTML ソース**
   - **baseline テキストログ**（検知ログと比較可能な項目を含む。design 参照）
4. 既存の差分検知・discord 連携の挙動を **壊さない**。

### FR-2 保存パス（ルート名 `download/` を維持）

Chrome `downloads.download` の相対パスは、PRD / リポジトリ慣習に合わせ **`download/` 配下** に整理する（ルート名は `download/` のまま。サブフォルダで用途別に分ける）。

詳細は design.md「保存パス・命名規則」。

### FR-3 検知成功時ログとの比較可能性

1. 検知成功時の既存テキストログ（`stock_log_*.txt`）も、**baseline と同じ日付フォルダ・同じ命名規則（種別プレフィックスのみ異なる）** に保存するよう整理する。
2. baseline ログと検知ログで、**同一キー**（`targetUrl`, `count`, `urls` 件数・一覧, `usedSelector`, `timestamp` 等）を揃え、同一日の `baseline_*` と `detected_*` を比較できるようにする。

### FR-4 popup 設定との関係

- popup の **「スクリーンショット」ON/OFF とは連動しない**（定時 baseline 用の保存は常に実施）。
- popup の **「HTMLソース」** 設定とも連動しない（baseline 用 HTML ソースは常に保存）。

---

## ⚙️ 非機能要件

- Manifest V3 / Service Worker 制約内
- スクショ・ソース取得のため一覧タブを一時的にアクティブ化してよい（監視中 UX への影響は最小化）
- 1セッションあたり baseline 証跡は **1セットのみ**（毎 tick 保存しない）
- タイムスタンプは **JST** 基準（既存 `generateFilename` と整合）

---

## ✅ 受け入れ条件（Acceptance Criteria）

- [ ] 監視開始日ごとに、初回 snapshot 成功後 **`download/aeon/stock/{yyMMdd}/`** 配下に baseline 用 PNG / HTML / txt が保存される
- [ ] ファイル名に **`yyMMdd-hhmmss`**（JST）が含まれる（例: `baseline_260601-115700.png`）
- [ ] baseline txt に `targetUrl`, `count`, `urls`（件数および一覧）, `usedSelector`, `timestamp`, `logType: baseline` 等が含まれる
- [ ] 検知成功時 txt が **同じ日付フォルダ** に `detected_yyMMdd-hhmmss.txt` 形式で保存され、baseline と項目比較可能
- [ ] popup「スクリーンショット」OFF でも baseline 証跡は保存される
- [ ] 検知フロー（`newUrls` → 他拡張通知）が従来どおり動作する

---

## 🚫 スコープ外（Out of Scope）

- discord_post_url_monitor 側の購入・ログイン処理
- 商品詳細ページの在庫復活検知
- 2ページ目以降の一覧取得
- 毎 tick ごとのスクショ・ソース保存
- リポジトリ `./download/` への直接ファイル書き込み（Chrome Downloads API 経由のみ）

---

## 🚧 制約事項

- 既存 `.steering/260529-aeon-stock-watch-window/requirements.md` との整合
- 実ファイルは **ユーザーの Chrome ダウンロードフォルダ** 配下に `download/...` として保存される（repo の `./download/` とパス規約を揃える）

---

## 🔍 影響範囲

- `src/background/background.js`（定時監視・snapshot・ログ・ダウンロード）
- `tests/aeon-scheduled-stock-check-sw-manual.md`（保存先確認手順の追記）

---

## ✅ 確定事項（旧・未確定事項）

| 項目 | 決定 |
|------|------|
| baseline 取得タイミング | **毎日必ず**（監視セッション開始後、初回 snapshot 成功時に1回） |
| 保存パス | **`download/` ルート維持**。サブフォルダ **`aeon/stock/`** 固定。日付フォルダ **`{yyMMdd}/`**（design 詳細） |
| 命名規則 | タイムスタンプ **`yyMMdd-hhmmss`**（JST、**年は2桁 `yy`**）。種別プレフィックス `baseline_` / `detected_` |
| popup「スクリーンショット」 | **連動不要**（定時 baseline は常に保存） |
| HTML ソース | **含める** |
| baseline と検知ログの役割 | **同一日・同一形式**で保存し、比較して在庫検知分析に使う |

---

## 📝 承認

* [x] ユーザー承認済み
