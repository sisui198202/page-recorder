# ai-notes.md

## 目的

Claude / Codex などの AI が、今回タスクの進行状況・判断補助・実務知見を後から素早く再利用できるように残す。

---

## 現在の実行状況

- タスク名: テストタブの本番経路化と旧経路削除
- 更新日: 2026-10-25
- 最後に更新したAI: Codex
- 状態: `実装中`
- 現在フェーズ: Phase 7。異なる商品URLを使う A: multiple への修正と自動テスト（19スイート・384件成功）まで完了。Chrome 確認待ち
- 今回の主目的: テストタブの A: single / A: multiple シナリオを本番と同じ二層セッション経路・自動判定にし、旧 `setInterval` 経路を削除する
- close前整理: セブンネットでのテストタブ手動確認と通常の単一・複数URL監視を完了。日産はメンテナンス中のため回帰確認対象外とし、セブンネットで代替した。保留中のサイト選択タスク（`feature/test-tab-site-selection`）は、このタスクでサイト選択を実装したため却下候補。
- 関連: 保留中の `261023-1332_multi-site-state-transition`（却下候補）と `261023-1427_test-tab-site-selection`（要否を後で判断）

---

## 参照優先順位

1. `requirements.md`
2. `design.md`
3. `tasks.md`
4. `ai-notes.md`

- `ai-notes.md` だけで仕様を確定しない
- 判断の確定理由は `decisions.md`
- 完了結果の要約は `done.md`

---

## 先に見るもの

- requirements.md:
- design.md:
- tasks.md:
- decisions.md:
- blockers.md:
- 関連 docs:
- 関連する過去タスク:

---

## 今回の非変更範囲

- 
- 
- 

---

## Phase 1 調査メモ（2026-10-23）

- 変更前の `npx jest`：17スイート・396件成功
- 受け入れテストの流れ：`startTwoTierAcceptanceTest` → `runMultipleMonitoringStartConfigs`（`useTwoTierSessions: true`）→ content の `runHighFrequencySession` で確認・自動変化 → `deactivateSingleMonitoringSession` から `recordTwoTierAcceptanceSessionResult` → `completeTwoTierAcceptanceTest` で設定を復元して判定。状態は `chrome.storage.local` の `twoTierAcceptanceTestStatus`
- 旧経路だけで使う主な名前（Phase 6 の削除候補）：`checkKeywordChange`（呼び出しは旧複数URL経路の1か所）、`createMonitoringLogic`、`shouldShowManualTestCodePromptForMultipleScenario`、`shouldAutoReproduceMultipleScenario` / `AUTO_REPRODUCE_MULTIPLE_SCENARIO_IDS`、`resolveKeywordDetectionDownloadType`、`completeKeywordDetectionMonitoringState`、`shouldStartMultiIntervalAfterImmediateCheck`、`hasMultipleMonitorDurationElapsed`、`runSingleIntegrationAutoTest` 系、`SINGLE_INTEGRATION_AUTO_TEST_*`、`registerMultipleTestLogSession`、`monitoringIntervals`（33か所。本番経路での使用有無は Phase 6 で1件ずつ確認）
- popup 側の旧入口：`startMultipleTestScenarioMonitoring`、`startInitialDetectedAutoTest`
- 候補サイト：日産（在庫あり 6810・6824、在庫なし 6876）、AEON、セブンネット、トイザらスはいずれも在庫あり・なしのサンプルがある

## うまくいった実装パターン

### YYYY-MM-DD

- 対象:
- 内容:
- 根拠:
- 区分: `[確認済み]` / `[推測]`

---

## うまくいかなかった実装パターン

### YYYY-MM-DD

- 対象:
- 試したこと:
- うまくいかなかった理由:
- 避けるべき点:
- 区分: `[確認済み]` / `[推測]`

---

## 手動テスト連携メモ

### 2026-10-25

- ユーザー報告: セブンネットショッピングの A: single / appear（自動）。Service Worker ログで基準HTML・スクリーンショット保存、基準取得後の自動文言変更、変更証跡保存、セッション停止、判定成功を確認。結果カードのスクリーンショットも確認。
- 成功 / 失敗: 成功。
- 判定: 結果カードは「成功 / appear（セブンネットショッピング） / セブンネットショッピング appear 1: 期待 検知 / 結果 検知」。T1 の成功条件を満たす。
- 次アクション: T2〜T5 を継続し、T5 ではテスト前に控えた単一・複数URL監視設定との一致を確認する。
- 反映先: `tasks.md` Phase 7。

### 2026-10-25（続き）

- ユーザー報告: セブンネットショッピングの A: single / disappear（自動）。基準HTML・スクリーンショット保存後にキーワード「カートに入れる」を1件削除し、変更証跡を保存、検知で停止して判定成功。
- 成功 / 失敗: 成功。
- 判定: 結果カードは「成功 / disappear（セブンネットショッピング） / セブンネットショッピング disappear 1: 期待 検知 / 結果 検知」。T2 の成功条件を満たす。
- 次アクション: T3（A: multiple 4・自動）を実施する。
- 反映先: `tasks.md` Phase 7。

### 2026-10-25（複数URLのテストデータ修正）

- 判断: A: multiple の2件目を同じ商品URLへの `ref=multi` 付加で作る方式は、別商品の複数URL監視を検証できないため廃止した。
- 実装: テストサイト候補は状態別URL配列を持ち、multiple は開始状態の先頭2件をそのまま使う。2件未満のときは開始不可にする。セブンネットをサンプル同期対象に加え、在庫あり・なし各2件を生成設定へ反映した。
- 検証: `npm test -- --runInBand` は19スイート・384件成功。Chrome実機のT3結果は次項へ記録。

### 2026-10-25（T3）

- ユーザー報告: セブンネットショッピングの A: multiple / auto_appear_two_urls（自動）。画面に `1101527096.html` と `2110693846.html` の異なる在庫なし商品URLを表示。
- 成功 / 失敗: 成功。
- 判定: 2セッションとも基準・変更証跡を保存して `detected` で停止し、結果カードはそれぞれ「期待 検知 / 結果 検知」。T3 の成功条件を満たす。
- 次アクション: T4（A: single 1・手動）を実施する。
- 反映先: `tasks.md` Phase 7。

### 2026-10-25（T4）

- ユーザー報告: セブンネットショッピングの A: single / appear（手動）。Service Workerに手動変更受付の残り20秒・10秒・5秒と受付終了が出た後、変更証跡を保存して検知。
- 成功 / 失敗: 成功。
- 判定: 結果カードは「成功 / appear（セブンネットショッピング） / 期待 検知 / 結果 検知」。T4 の成功条件を満たす。
- 次アクション: T5 で本番の単一・複数URL監視設定がテスト前と同じことを確認する。結果カードの開始・完了日時表示も再読み込み後に確認する。
- 反映先: `tasks.md` Phase 7。

### 2026-10-25（T5）

- ユーザー報告: テスト実行前に控えた本番の単一URL監視設定と複数URL監視の対象一覧を照合。
- 成功 / 失敗: 成功。
- 判定: T1〜T4 の開始・終了後も本番設定は変わっていない。T5 の成功条件を満たす。
- 次アクション: Phase 7 に残る日時表示・日産を含むシナリオ・通常監視のChrome確認を行う。
- 反映先: `tasks.md` Phase 7。

### 2026-10-25（結果カード日時）

- ユーザー報告: 拡張再読み込み後、セブンネットショッピングの appear 成功結果カードを確認。
- 成功 / 失敗: 成功。
- 判定: 「開始日時: 2026/10/25 10:56:04」「完了日時: 2026/10/25 10:56:21」が日本時間で表示され、セッション結果も「期待 検知 / 結果 検知」のまま。
- 次アクション: Phase 7 に残る日産を含むChrome確認と通常監視の確認を行う。
- 反映先: `tasks.md` Phase 7。

### 2026-10-25（セブンネット initial_detected）

- ユーザー報告: A: single / initial_detected（自動）。在庫ありURL `1107382767.html` で開始直後に検知。
- 成功 / 失敗: 成功。
- 判定: 変更証跡のHTML・スクリーンショット保存後に `detected` で停止し、結果カードは「期待 検知 / 結果 検知」。
- 次アクション: セブンネットの initial_not_detected を確認する。
- 反映先: `tasks.md` Phase 7。

### 2026-10-25（セブンネット initial_not_detected）

- ユーザー報告: A: single / initial_not_detected（自動）。在庫なしURL `1101527096.html` で開始。
- 成功 / 失敗: 成功。
- 判定: 基準HTML・スクリーンショットを保存して約60秒後に `expired` で停止し、結果カードは「期待 時間満了 / 結果 時間満了」。
- 次アクション: セブンネットの element_not_found_check（シナリオ6）を確認する。
- 反映先: `tasks.md` Phase 7。

### 2026-10-25（セブンネット element_not_found_check）

- ユーザー報告: A: single / element_not_found_check（自動）。在庫ありURL `1107382767.html` を専用の未一致セレクタで監視。
- 成功 / 失敗: 成功。
- 判定: `selector_error` で停止し、結果カードは「期待 セレクタエラー / 結果 セレクタエラー」。
- 次アクション: セブンネットの A: multiple / baseline_two_urls を確認する。
- 反映先: `tasks.md` Phase 7。

### 2026-10-25（セブンネット baseline_two_urls）

- ユーザー報告: A: multiple / baseline_two_urls（自動）。在庫なしURL `1101527096.html` と `2110693846.html` を同時に監視。
- 成功 / 失敗: 成功。
- 判定: 双方の基準HTML・スクリーンショットを保存して約60秒後に `expired` で停止し、結果カードは2件とも「期待 時間満了 / 結果 時間満了」。
- 次アクション: セブンネットの A: multiple / auto_appear_two_urls（手動）を確認する。
- 反映先: `tasks.md` Phase 7。

### 2026-10-25（セブンネット multiple手動）

- ユーザー報告: A: multiple / auto_appear_two_urls（手動）。在庫なしURL2件で、それぞれ受付時間中の手動コードを実行。
- 成功 / 失敗: 成功。
- 判定: 2タブとも残り20秒・10秒・5秒と受付終了のログが出て、双方が変更証跡保存後に `detected` で停止。結果カードは2件とも「期待 検知 / 結果 検知」。
- 補足: popup を開き直した際に選択がシナリオ1へ戻った表示であり、手動multipleの文言不整合ではない（ユーザー訂正）。
- 次アクション: 日産・通常監視のChrome確認へ進む。
- 反映先: `tasks.md` Phase 7。

### 2026-10-25（手動未実行時の失敗）

- ユーザー報告: セブンネットで手動コードを実行せず、A: single / appear と A: multiple / auto_appear_two_urls を時間満了まで実行。
- 成功 / 失敗: 期待どおりの失敗。
- 判定: single は1件、multiple は2件とも「手動変更が確認できませんでした」と表示され、手動モードの未実行時失敗条件を満たす。
- 次アクション: 通常の単一／複数URL監視（今すぐ開始）を確認する。日産はメンテナンス中のため復旧後の回帰確認へ保留。
- 反映先: `tasks.md` Phase 7。

### 2026-10-25（通常の単一URL監視）

- ユーザー報告: セブンネットショッピングで通常の単一URL監視を「今すぐ開始」。
- 成功 / 失敗: 監視は成功。変更証跡のHTML・スクリーンショットを保存して `detected` で停止し、Chrome通知とGmail通知を送信。
- 補足: 外部拡張通知は `Could not establish connection. Receiving end does not exist.` で失敗。受信側拡張が存在しない環境要因であり、PageRecorderの監視結果には影響しない。
- 次アクション: 通常の複数URL監視を「今すぐ開始」で確認する。
- 反映先: `tasks.md` Phase 7。

---

## 未解決事項

- 論点:
- 決定に必要な条件:

- 論点:
- 決定に必要な条件:

---

## 次のAIへの注意点

- 誤解しやすい前提:
- 先に確認すべきログ / ファイル:
- 引き継ぎ時の注意:
