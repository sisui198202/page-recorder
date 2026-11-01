# design

## 設計方針

- 既存 B/C の監視実装を再利用し、テスト専用 session key と alarm 名を追加する。テスト用 tick は既存の snapshot 取得経路を副作用なしで呼び、結果だけを専用状態へ保存する。
- B の通常アラーム同期と C の JSON アラーム同期を独立した関数にし、どちらかの無効設定が他方を止めないようにする。
- C 状態は JSON 定義、C session、C alarm、直近ログを background で集約して popup に返す。popup は表示・再同期以外に C 定義を変更しない。
- テストタブは既存 A シナリオを維持し、B/C を選択して background にテスト開始・状態取得を依頼する。
- Alfred は生成元 JSON へ DevTools スニペットを追加し、既存の生成スクリプトで配布 JSON を更新する。

## メッセージ契約

| メッセージ | 役割 |
| --- | --- |
| `getScheduledWatchSitesStatus` | C の設定・状態・エラーを取得する |
| `resyncScheduledWatchSites` | C アラームを再同期し、実在アラームとの照合結果を返す |
| `startScheduledWatchTest` | B または選択 C サイトの安全テストを開始する |
| `getScheduledWatchTestStatus` | 安全テストの進行・結果を取得する |
| `startInitialDetectedAutoTest` | A single の開始直後検知を専用sessionで開始する |
| `completeKeywordMissingAutoTest` | A single シナリオ5の開始前バリデーション完了を session・通知へ記録する |
| `getInitialDetectedAutoTestStatus` | A single 自動判定の進行・結果を取得する |

## 変更対象

- `src/background/background.js`: B/C 同期分離、C 状態、テスト session/alarm/message。
- `src/ui/popup.html`, `src/ui/popup.js`: A/B/C 区分、C 表示・再同期、B/C テスト UI。
- `tests/unit/*`: popup と background の回帰テスト。
- Alfred の `stock_watch_snippets.src.json`、生成スクリプト、生成 JSON と手順書。

## 不変条件

- 通常 B/C の storage key、C JSON schema、通知 payload は変更しない。
- B/C 安全テストは通知、タブ表示、ダウンロード、baseline 永続化をしない。
- 対象の通常 B/C session が動作中ならテストを拒否する。
- A single の自動判定は通常の `startMonitoring` を呼ばず、テスト専用の状態を `chrome.storage.session` と Service Worker メモリに保持する。結果は browser 終了時に破棄し、popup 再オープン時は session 保存値から復元する。成果物は `PageRecorder-test/initial-detected/` に残し、ダウンロード完了イベントを照合する。終了時は `getPermissionLevel` で許可を確認し、許可済みなら固定通知IDを `clear` 後に `silent: false`・`requireInteraction: true` で作成し、`getAll` で通知センター登録を照合する。`permission_denied`、`created`、`not_found_after_create`、`error` は判定結果とは独立して session 状態へ保存する。
- A single のシナリオ5以外の残り5シナリオは、短いテスト専用 interval/duration と専用 run ID を持つ設定で、popup message handler と共通の `startSingleMonitoring` / `stopSingleMonitoring` を直接呼び出す。出現・消失は `initialKeywordDetection: false`、リロード後待機中に DOM 再現コードを一度だけ自動挿入し、`挿入開始 → 挿入完了 → 判定開始 → 期待条件を検知 → 保存処理完了 → 通常監視終了` の run ID 付きログと状態を照合する。自動再現の待機では手動投入案内を出さない。timeout 時は停止処理と実行ロック解除の完了まで待機し、未完了なら保存待機 timeout としてタブ削除を行わない。空キーワードは popup の開始前バリデーション後に専用完了 message を送り、session 状態・run ID 付きログ・固定ID通知と通知センター照合を残す。通常監視、タブ作成、設定保存は行わない。実行前の設定を復元する。
- A single の session 状態には、popup 表示専用の `decisionReason` と `verificationItems` を保存する。各確認項目は表示名、成功可否、短い根拠を持つ。popup はこれを「合格理由」または「判定理由」と確認項目として表示し、生ログは表示しない。シナリオ6/7は監視状態の正規化済み `errorReason` が期待値と一致し、interval 削除と実行ロック解除まで完了した場合のみ `expectedOutcome` を成功にする。
- A single の自動判定結果は popup 幅 `420px` の結果カードで表示する。カードは状態バッジ・判定見出し・理由・全確認項目・完了通知状態を分離し、不合格／要確認／実行中では未達項目を先頭に置く。session の `decisionReason` と `verificationItems` 契約は変更しない。
- B/C 安全テストの status に表示専用の `decisionReason` と `verificationItems` を加える。確認項目は商品取得セレクタ結果件数とsnapshot取得件数とし、popup はA singleと同じカード部品・配色で状態、対象、判定理由、確認項目、無副作用の範囲を表示する。開始拒否は status にも同じ表示契約を保存する。
- C アラーム再同期は `resyncResult` を応答に含める。同期後の `chrome.alarms.getAll()` を、各有効サイトで期待する baseline と監視開始アラーム名に照合する。最新結果は専用 `chrome.storage.session` key に保存し、`getScheduledWatchSitesStatus` の message 応答にも追加する。popup は初期取得・C状態更新時に復元する。成功／要確認／失敗のカードには有効サイト数、期待数、設定済み数、未設定または設定不足の対象を表示する。未実行時はカードを隠し、session が消える Chrome 終了または拡張再読み込み後には復元しない。
- C セクションの「C状態を更新」は `refreshScheduledWatchSites()` を呼ぶ表示専用操作とし、`getScheduledWatchSitesStatus` の応答からサイト一覧・直近実行結果・保存済み再同期結果を再描画する。`resyncScheduledWatchSites` は呼ばず、アラーム作成・削除、設定変更、session結果の更新を行わない。取得失敗は既存のpopupエラー表示へ渡す。
- C の実運用結果はサイトごとの専用 `chrome.storage.session` key に保持し、C状態に `latestExecution` として追加する。開始時は実行中、snapshotで指定セレクタの `matchedCount` と `textPreview`、監視予定枠の開始・終了時刻を記録し、終了時に時間満了または新商品検知かつテキスト取得済みなら正常完了と確定する。取得例外・未取得は失敗、テキスト未確認は要確認とする。popupは初期表示後から表示中だけ、C実行の有無にかかわらず5秒間隔で C状態を更新する。タイマーは1本に保ち、状態取得中は同じPromiseを共有して重複送信しない。自動更新の失敗は警告ログだけを残して前回表示を維持し、`pagehide` でタイマーを停止する。状態・実行時間・予定枠・終了・3数値を優先表示する。取得テキストは改行を維持した先頭3行かつ最大360文字のプレビューを表示し、残りは`details`の全文展開へ置く。session保存時の2,000文字上限は変更しない。
