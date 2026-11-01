# tasks — gmail-detection-notifications

起点: `plan/todo.md` の Gmail 検知通知項目。

## Phase 1: OAuth・共通 Gmail 送信基盤

- [x] `manifest.json` に `identity`、Gmail API host permission、`gmail.send` scope、PageRecorder 用 OAuth client ID を追加する。
- [x] background に Gmail 設定/結果の正規化、宛先検証、UTF-8/RFC 2047 件名、Base64URL MIME 生成、トークン取得、API 送信、結果保存を集約する。
- [x] テスト送信は interactive、本番検知は non-interactive とし、認証要・入力不正・API失敗を区別する。
- [x] Gmail 送信のログで宛先、トークン、本文を出さず、既存の `logger` / `bgLog*` で成功・失敗を記録する。
- [x] 共通 Gmail 送信基盤のユニットテスト（宛先、UTF-8件名、raw、認証/API成否）を追加し、対象テストを実行する（2026-09-12: 13件の Gmail 関連テストと全232件が成功）。

## Phase 2: Popup 設定・テスト送信

- [x] popup に Gmail 通知の有効/無効、送信先、テスト送信、直近結果を表示するセクションを追加する。
- [x] `gmailNotificationSettings` と `gmailNotificationLastResult` の保存・復元、未保存時の無効/空送信先、送信中のボタン無効化を実装する。
- [x] `sendGmailTestEmail` message を既存 background listener に統合し、`{ success, status, message }` 応答を popup で表示する。
- [x] popup の保存・復元・送信中/成功/失敗表示と message 応答のユニットテストを追加して実行する（2026-09-12: `popup-gmail-notification.test.js` 成功）。

## Phase 3: A/B/C 本番検知への接続とテスト抑止

- [x] A の単一・複数キーワード検知確定時に、共通 Gmail 送信を 1 回だけ best-effort で呼ぶ。
- [x] B/C の新商品 URL 差分検知時に、既存の保存・Chrome 通知・外部拡張通知とは独立して共通 Gmail 送信を呼ぶ（2026-09-12: C URL差分テストは、URL用baselineと商品総数用baselineを分離し、URL 20件・商品総数25件で Gmail に 24件 → 25件を渡すユニットテストを追加。Chrome手動確認でも AEON ポケモンセンターオンラインの差分検知メール本文が 24件 → 25件・新規URL数1件となることを確認）。
- [x] メールに日時、種別、対象 URL、サイト名、キーワードまたは前後件数、新規 URL 最大 10 件を含める。
- [x] A 自動/複数テストと B/C 安全テストに、永続化しない `suppressGmailNotification` を付与する（2026-09-12: B安全テストはターゲットセレクタ未確定のため、Gmail検知送信の確認対象外とする）。
- [x] A/B/C の各検知 1 回送信、無効・未検知・タイムアウト・エラー・テスト起点の未送信をユニットテストで確認する（2026-09-12: 共通ラッパーと検知経路の契約、抑止分岐を確認）。
- [x] シナリオ8だけ Gmail 抑止なしで通常監視・DOM自動再現を通し、今回の実行IDに対応する Gmail API 送信結果を自動判定する（2026-09-12: Gmail 実行ID、設定・認証事前確認、成功/失敗照合のユニットテストを追加）。

## Phase 4: 文書・Chrome 実機確認

- [x] Gmail 認証、テスト送信、A/B/C 検知、無効時、認証切れ時の手順を `tests/docs/` に追加し、索引を更新する。
- [x] PRD の通知境界を Gmail API の任意の検知結果送信先まで更新する。
- [x] `npm test`、`npm run check:plan-todo`、`git diff --check` を実行する（2026-09-12: Jest全244件、plan TODO検査、差分検査が成功）。
- [x] Chrome で初回 OAuth とテストメール送信を確認する（2026-09-12: テストユーザー登録後、popup の「直近の送信結果: 送信成功」と受信を確認）。
- [x] Chrome でシナリオ8を自動判定実行し、通常監視・DOM再現・検知・保存・今回の Gmail API 検知送信・停止・設定復元・タブ終了が合格することを確認する（2026-09-12: popup 結果カードで全9項目の合格と完了通知「送信済み」、受信箱への到着と本文を確認）。
- [x] Chrome で A/C 検知メール、無効時未送信、認証切れ時に既存監視が継続することを確認する（2026-09-12: 無効時未送信と認証切れ時の既存監視継続を確認。B安全テストのGmail検知確認は対象外）。

## 完了条件

- [x] 上記 Phase の実装・自動確認・Chrome 手動確認を完了し、チェック状態を実態に同期する（2026-09-12）。
- [x] 手動確認結果は同一ターンに `tasks.md` と `ai-notes.md` へ要約して同期する（2026-09-12: C差分テストのGmail本文、無効時未送信、認証切れ時の監視継続を同期）。
