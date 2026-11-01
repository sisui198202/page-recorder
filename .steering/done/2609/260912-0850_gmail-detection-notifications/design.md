# design — gmail-detection-notifications

## 方針

- `manifest.json` に `identity`、`https://www.googleapis.com/*`、`oauth2` を追加する。scope は `https://www.googleapis.com/auth/gmail.send` のみ、client ID は提示済みの `YOUR_CLIENT_ID.apps.googleusercontent.com` を使う。Client Secret JSON は参照・同梱しない。
- Gmail の生成・認証・送信・結果保存は `background.js` に集約し、既存の message listener に `sendGmailTestEmail` case を追加する。popup は設定 UI と message 呼出しだけを担う。

## Gmail 送信境界

- `gmailNotificationSettings` の形式は `{ enabled: boolean, recipientEmail: string }` とし、未保存値は `{ enabled: false, recipientEmail: "" }` に正規化する。
- `gmailNotificationLastResult` は `{ status, message, sentAt, source, testRunId? }` とし、`status` は `success`、`auth_required`、`validation_error`、`api_error` を使う。`source` は `test` または `detection` とする。`testRunId` はシナリオ8の今回の検知送信だけを照合する内部用任意値であり、送信先・トークン・本文は保存しない。
- 背景の共通ヘルパーは、宛先を検証し、UTF-8/RFC 2047 件名と text/plain UTF-8 MIME を生成し、Base64URL の `raw` として Gmail messages.send API へ渡す。MIME・件名・Base64URL の変換は一箇所に置く。
- テスト送信だけ `chrome.identity.getAuthToken({ interactive: true })` を使う。本番検知は `{ interactive: false }` のみを使い、認証が必要なら `auth_required` を保存・ログして終了する。
- 送信有効でない、宛先がない、または `suppressGmailNotification` が true のときは API・認証を呼ばず skip する。例外と非 2xx 応答は `api_error` として保存し、`logger` / `bgLog*` で宛先・トークン・本文を出さずに記録する。共通ヘルパー自身が失敗を結果化するため、呼出元の既存処理は継続する。

## 検知イベントと抑止

- A の単一・複数キーワード検知では、検知確定かつ保存処理後の既存停止処理に入る前に、検知種別 `keyword`、対象 URL、サイト名、キーワード、検知モードを渡して共通ヘルパーを 1 回呼ぶ。
- B の `handleStockWatchDetection`、C の `handleMultiSiteDetection` では、各既存の保存・Chrome 通知・外部拡張通知とは独立した best-effort 呼出しとして、検知種別 `new_product_url`、対象 URL、サイト名、前後件数、未切詰めの新規 URL を渡す。メール本文で URL は先頭 10 件に切り詰め、残件数も示す。
- A の自動テスト・multiple テスト開始時は開始用の runtime settings にのみ `suppressGmailNotification: true` を付与する。ただしシナリオ8だけは Gmail 有効・有効な送信先・テストメール成功を事前確認した後、`suppressGmailNotification: false` と今回の `gmailTestRunId` を runtime settings にだけ付与する。B/C 安全テストの session にも抑止フラグを持たせる。B安全テストは指定URLのターゲットセレクタが未確定のため、Gmail検知送信の確認対象外とする。いずれも `monitoring_config` やサイト JSON に永続化しない。
- シナリオ8は通常の single 監視を開始し、リロード後の待機中に在庫なし DOM を在庫ありへ自動再現する。保存・Chrome 通知・既存 Gmail 検知送信経路を通過後、同じ実行IDの `gmailNotificationLastResult` が `success` の場合だけ合格とする。`auth_required`、`validation_error`、`api_error`、実行ID不一致は理由付きで不合格または要確認とし、受信箱への到着・本文確認は手動に残す。
- C の URL差分テストでは、popup結果カードの URL取得・テスト用baseline作成は URL 件数を表示し続ける。一方、Gmail 検知送信に渡す前回件数は初回snapshotの商品総数から1件除外した値を使い、URL件数と商品総数が異なる場合もメール本文の増加件数を商品総数基準にする。
- 本番以外の分岐は検知ヘルパーを呼ばない。したがって未検知、エラー、タイムアウト、baseline、テスト session はメールを送らない。

## Popup と公開契約

- popup の共通設定領域に「Gmail 通知」セクションを追加する。チェックボックス、メールアドレス入力、テストメール送信ボタン、状態表示を置く。
- popup は初期化時に local storage から設定と直近結果を復元し、変更時に設定だけを local storage へ保存する。テスト送信中はボタンを無効化し「送信中」を表示する。
- `sendGmailTestEmail` の応答は `{ success, status, message }` とする。`success` は成功時のみ true とし、入力不正・認証要・API失敗を `status` で区別して表示する。

## テストと文書

- background unit test に、メールエンコード、宛先検証、interactive 方針、Gmail API の成功/失敗、A/B/C からの単発呼出し、抑止分岐を追加する。
- popup unit test に、storage の既定値・保存・復元、送信中/結果表示、background 応答の表示を追加する。
- `tests/docs/` に Gmail の初回 OAuth、テスト送信、A/B/C 検知、無効、認証切れの手順を追加し、索引を更新する。PRD の通知境界には Gmail API を「任意の検知結果送信先」として追記する。
