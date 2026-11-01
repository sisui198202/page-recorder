# tasks.md

詳細ルールは [tasks テンプレート README](~/Documents/Summary/11_テンプレート/40_タスク管理/README.md) を参照

---

<a id="status-rules"></a>

## ✅ チェック状態の定義

- [ ] 未着手。今回タスクで対応予定の項目
- [~] 実装済み。実装は完了したが、確認が未完了の項目
- [x] 完了。対象項目について、実装と確認の両方が完了した項目
- [-] 保留。このタスクでは今回対応しないが、再検討・対応余地がある項目
- [/] 却下。今回タスクでは不採用確定の項目

---

<a id="execution-phases"></a>
<a id="phase-1"></a>

# Phase 1: 事前確認

## 🧩 実装

- [x] requirements.md の内容を確認する
- [x] design.md の内容を確認する
- [x] 変更対象ファイルを確認する
- [x] 影響範囲を確認する
- [x] 完了条件を確認する

## 🧪 手動テスト

- [x] 現状の監視動作を確認する
- [x] 既存のFetch診断機能を確認する

---

<a id="phase-2"></a>

# Phase 2: fetchModeフィールド追加

## 🧩 実装

- [x] scheduled-watch-sites.json に fetchMode フィールドを追加する
- [x] 全サイトに enabled: false, fallbackToDom: true をデフォルト設定する

## 🧪 手動テスト

- [-] JSON読み込みでエラーが出ないことを確認する
- [-] 既存の監視機能が影響を受けないことを確認する

---

<a id="phase-3"></a>

# Phase 3: オーバーライド機構

## 🧩 実装

- [x] loadScheduledWatchOverrides 関数を追加する
- [x] saveScheduledWatchOverrides 関数を追加する
- [x] loadScheduledWatchSites でオーバーライドをマージする
- [x] updateSiteFetchModeOverride ヘルパー関数を追加する

## 🧪 手動テスト

- [-] オーバーライド設定が正しく保存・読み込みされることを確認する
- [-] マージ後の設定が期待通りであることを確認する

---

<a id="phase-4"></a>

# Phase 4: Fetch監視ロジック

## 🧩 実装

- [x] captureScheduledSnapshotViaFetch 関数を追加する
- [x] offscreen.js に URL抽出モードを追加する
- [x] Fetch実行 → offscreen解析 → snapshot返却の流れを実装する

## 🧪 手動テスト

- [-] FETCH_SUPPORTED サイトでFetch監視が動作することを確認する
- [-] 取得したURLリストが期待通りであることを確認する

---

<a id="phase-5"></a>

# Phase 5: 分岐・フォールバック

## 🧩 実装

- [x] runMultiSiteTickInternal で fetchMode.enabled を判定する
- [x] Fetch失敗時のフォールバック処理を実装する
- [x] ログ出力を追加する

## 🧪 手動テスト

- [-] fetchMode.enabled: false のサイトがDOM監視で動作することを確認する
- [-] Fetch失敗時にDOM監視へフォールバックすることを確認する
- [-] ログが適切に出力されることを確認する

---

<a id="phase-6"></a>

# Phase 6: 取得方式選択UI

## 🧩 実装

- [-] 単一URL監視にFetch／リロード選択と保存を追加する
- [-] 複数URL監視の共通設定にFetch／リロード選択と保存を追加する
- [-] 定時複数サイト監視にサイト別Fetch／リロード選択を追加する
- [x] 診断結果から取得方式を変更するボタン・メッセージを削除する

## 🧪 手動テスト

- [x] 単一URL・複数URLの選択がpopup再表示後も維持されることを確認する
- [x] 定時複数サイトの選択がpopup再表示後も維持されることを確認する
- [x] 診断結果が方式設定を変更しないことを確認する

---

<a id="phase-7"></a>

# Phase 7: 統合確認

## 🧩 実装

- [-] A系高頻度FetchをContent Scriptで継続する処理を追加する
- [-] A系Fetch検知時に通知を先行し、再読込後に証跡を保存する処理を追加する
- [-] Fetch失敗時に同一セッションをリロード方式へフォールバックする処理を追加する
- [-] 不要な診断連携コードを削除する
- [x] PRD/functional-design.md に取得方式選択の記述を追加する
- [-] 対象ごとの実行履歴（開始・チェック・終了）を保存する
- [-] popupに実測間隔を含む実行履歴パネルを追加する
- [-] AI判断サポートファイルへ取得方式とチェック履歴を追加する
- [x] Service WorkerログへFetchチェックの実測間隔・設定間隔・結果を出力する
- [x] 系統A/CのFetch経路とMV3制約を設計ガイドへ記録する

## 🧪 手動テスト

- [x] A系Fetchがタブをリロードせず指定間隔で監視する（2026-09-25: Fetch 20秒で3回、実測20.0秒を確認）
- [x] A系Fetch検知時に通知と証跡保存が動作する
- [x] C系Fetch／リロードが選択どおりに動作する
- [x] Fetch失敗時にリロード方式へフォールバックする
- [-] Fetch 20秒設定で、popupとAI判断サポートファイルに約20秒の実測間隔が表示される（AI判断サポートは確認済み。popupの同一実行での確認は残り）
- [x] Fetch 20秒設定で、Service Workerログに各Fetchの実測間隔が表示される（2026-09-25: 2回目以降20.0秒を確認）

---

<a id="phase-8"></a>

# Phase 8: 仕上げ

## 🧩 実装

- [x] tasks.md の完了状態を最終確認する
- [-] design.md との差分がないことを確認する
- [-] requirements.md とのズレがないことを確認する
- [-] 必要に応じて docs / decisions.md を更新する

## 🧪 手動テスト

- [x] 最終確認を実施する
- [x] 完了条件を満たしていることを確認する

---

<a id="tail-notes"></a>
<a id="notes"></a>

## 🔍 差分・課題メモ

- [x] 自動確認: `npm test -- --runInBand` は15スイート・328件成功。`node --check` と `git diff --check` も成功。
- [x] Chrome手動確認: 取得方式の保存・Fetch継続・検知時証跡・Fetch失敗フォールバックを確認する。

---

<a id="completion-criteria"></a>

## 📝 完了条件

- [x] design.md に記載された今回対象範囲をすべて実装済み
- [x] 各Phaseの実装・確認について、対象項目は完了済み
- [x] 今回対応しない項目は `[-]` または `[/]` として整理済み
- [x] `tasks.md` と実装・確認状態が一致している
- [-] 未解決事項は decisions.md または未確定事項に反映済み
- [x] ユーザー確認済み
