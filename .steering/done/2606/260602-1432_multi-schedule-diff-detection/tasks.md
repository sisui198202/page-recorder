# Tasklist: 定時差分検知の複数設定対応

## Phase 1: 基盤（JSON設定ファイル）

### 実装

- [x] `src/config/scheduled-watch-sites.json` 作成
- [x] JSON設定の読み込み関数実装 (`loadScheduledWatchSites()`)
- [x] 設定バリデーション処理

### 手動テスト

- [x] JSONファイルが正しく読み込めること（構文チェック通過）
- [x] 不正なJSONでエラーハンドリングされること

---

## Phase 2: 複数アラーム対応

### 実装

- [x] サイト別アラーム設定処理 (`syncMultiSiteScheduledCheck()`)
- [x] アラーム名のパース処理（`getSiteAlarmName()`, `extractSiteIdFromAlarm()`）
- [x] 既存アラームとの共存処理

### 手動テスト

- [x] 各サイトのアラームが正しく設定されること
  - 確認: 2026-06-04 12:37 aeon-pokemon, aeon-onepiece 両方が監視開始
- [x] 既存のsingle監視が引き続き動作すること
  - 確認: aeon-pokemonのschedule:0, schedule:1 が正しく連続動作

---

## Phase 2.5: 監視ログの詳細化

### 実装

- [x] `schedules` 配列サポート（複数時間帯対応）
  - `getSchedulesFromSite()` 関数追加
  - `extractSiteInfoFromAlarm()` でscheduleIndex抽出
  - `startScheduledStockWatchForSite(siteId, scheduleIndex)` 対応
- [x] 監視開始ログの詳細化（サイト名、監視時間、チェック間隔、タブID）
- [x] Tick実行ログの詳細化（現在URL数、ベースライン、残り時間）
- [x] 監視終了ログの詳細化（終了理由、タブ終了確認、日時）
- [x] 新商品検知ログの詳細化（検知数、新規URL一覧）
- [x] `src/config/README.md` に `schedules` 配列のドキュメント追加

### 手動テスト

- [x] Service Workerコンソールで監視開始ログが表示されること
- [x] Tick実行ごとに詳細ログが表示されること
- [x] endTime到達時に監視終了ログとタブ終了が確認できること
- [x] 複数スケジュール（schedules配列）が正しく動作すること

---

## Phase 3: 監視処理の複数化

### 実装

- [x] `scheduledWatchSessions` 構造の実装 (`MULTI_SITE_SESSIONS_KEY`)
- [x] サイトID別セッション管理 (`getMultiSiteSession()`, `setMultiSiteSession()`, `removeMultiSiteSession()`)
- [x] 監視開始処理のサイトID対応 (`startScheduledStockWatchForSite()`)
- [x] 監視Tick処理のサイトID対応 (`runStockWatchTickForSite()`)
- [x] 差分検知処理のサイトID対応 (`handleMultiSiteDetection()`)

### 手動テスト

- [x] 複数サイトが同時監視できること
  - 確認: aeon-pokemon(タブID:439275954), aeon-onepiece(タブID:439275953) 同時動作
- [x] 各サイトのセッションが独立していること
  - 確認: 各サイトが別タブ・別間隔（30秒/60秒）で独立動作
- [x] 1サイトの検知が他サイトに影響しないこと
  - 確認: aeon-pokemon[schedule:0]終了(12:38)後もaeon-onepiece継続動作

---

## Phase 4: 通知先分離

### 実装

- [x] `notifyExternalExtension()` に siteId/discordChannelId オプション追加
- [x] JSON設定に `discordChannelId`, `externalExtensionId` フィールド追加
- [x] `handleMultiSiteDetection()` から通知呼び出し

### 手動テスト

- [x] サイトごとに異なる通知先へ送信されること
  - 事前設定: `src/config/scheduled-watch-sites.json` の `notification` をサイト別に設定
  - 設定例: `aeon-pokemon.discordChannelId = "1476859251145183253"`
  - 設定例: `toysrus-pokemon.discordChannelId = "1511979758186008596"`
  - 設定例: 両サイトの `externalExtensionId = "ibmbjnemcpminbmenepldhockemdpomc"`
  - 受信側確認: 通知先拡張機能の Service Worker / background で受信ログを開く
  - 1回目: `aeon-pokemon` 監視を実行して baseline を保存
  - 2回目: AEON 一覧ページでテスト商品を追加して差分検知を発火
  - 確認: 受信 message の `siteId` が `aeon` であること
  - 確認: 受信 message の `discordChannelId` が `1476859251145183253` であること
  - 3回目: `toysrus-pokemon` 監視を実行して baseline を保存
  - 4回目: トイザらス一覧ページでテスト商品を追加して差分検知を発火
  - 確認: 受信 message の `siteId` が `toysrus` であること
  - 確認: 受信 message の `discordChannelId` が `1511979758186008596` であること
  - 確認: `aeon-pokemon` の通知時に `toysrus` の `discordChannelId` が混入しないこと
  - 確認: `toysrus-pokemon` の通知時に `aeon` の `discordChannelId` が混入しないこと
  - 補助確認: PageRecorder 側ログに `📨 他拡張通知完了` が出ること
  - 補助確認: 必要に応じて Service Worker コンソールで `chrome.runtime.sendMessage(...)` を直接実行し、`discordChannelId` ごとの受信だけ先に疎通確認する

---

## Phase 5: 統合テスト

### 手動テスト

- [x] AEON ポケモンカードで定時監視
  - 確認: 2026-06-04 schedule:0(12:37-12:38), schedule:1(12:39-12:41) 動作
- [x] 2つ目のサイトを追加して同時監視
  - 確認: aeon-onepiece を追加し、aeon-pokemon と同時監視動作
- [x] enabled=false のサイトが監視されないこと
- [x] 既存popup設定との共存確認

---

## 条件付きPhase: popup UI対応（※今回対象外）

> 複数サイト設定はJSONファイル直接編集で運用するため、今回はUI実装をスキップ。
> 将来必要になった場合に別タスクで対応。

### 該当条件

- popup UIでの複数設定表示・編集が必要な場合

### 実装

- [x] 複数サイト設定一覧表示 → 対象外（JSON直接編集で運用）
- [x] サイト有効/無効切替UI → 対象外（JSON直接編集で運用）
- [x] 新規サイト追加UI → 対象外（JSON直接編集で運用）

### 手動テスト

- [x] UIからサイトの有効/無効を切り替えられること → 対象外
- [x] 設定変更がJSONに反映されること → 対象外

---

## 完了条件

- [x] `.json` ファイルで設定を定義・読み込みできる
- [x] 各サイトの監視を個別に有効/無効にできる（JSON設定で）
- [x] 2つ以上のURLを同時監視できる
  - 確認: 2026-06-04 aeon-pokemon, aeon-onepiece 同時監視動作
- [x] 既存のAEON監視機能が引き続き動作する
  - 確認: 複数スケジュール(schedule:0→schedule:1)も正常動作
