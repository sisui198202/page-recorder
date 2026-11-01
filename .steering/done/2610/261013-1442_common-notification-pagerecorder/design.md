# design.md

## 方針

- `shared/lib/notification/` を正本とし、IIFE 版を `PageRecorder/src/lib/notification/` へ同期する。
- Service Worker の `importScripts()` で `ChromeNotify` と `ExternalMessaging` を読み込む。
- 定時在庫差分検知だけを `ChromeNotify.show()` に移行する。baseline更新後、検知証跡のダウンロード・外部送信・Gmail送信より先に通知を作成し、OSバナー描画のため1.5秒待ってからダウンロードを開始する。通知文言、アイコン、自動消去なしの既存挙動は維持する。
- `notifyExternalExtension()` は `ExternalMessaging.send()` を使う。B は設定した `discordChannelId` をセッション経由で payload に含め、未設定の既存送信は送信前検証で止めない。
- `ExternalMessaging.send()` の通信成功だけでなく、受信側 response の `success: false` も送信失敗として `bgLogWarn` に記録する。
- `ChromeNotify` / `ExternalMessaging` が失敗結果を返した場合、PageRecorder は `bgLogWarn` で記録して処理を継続する。
- B 即時監視の実行対象は popup と同じ優先順位で解決する。`scheduled-watch-sites.json` の buy-target プロファイルを優先し、存在しないサイトだけ `ec-sites.json` のプロファイルへフォールバックする。解決不能時は対象別の設定不整合理由を状態応答へ含める。開始0件は失敗として返し、popup は不整合対象を選択不可にして理由を表示する。設定の自動補正は行わない。

## 対象外

- 監視期間終了、自動判定テスト完了など他の Chrome 通知。
- 外部メッセージのフィールド・保存形式・送信先拡張 IDの変更。
- discord_post_url_monitor への共有基盤配布。

## 確認

- shared 通知モジュールの単体テスト、PageRecorder の関連 Jest テスト、Service Worker 構文チェックを実行する。
- 実機の定時在庫差分検知で通知表示と `[chrome-notify] 通知作成成功` を確認する。
- 外部通知を有効にした検知で、既存 payload と送信成功ログを確認する。

## 承認

- [x] ユーザー承認済み（2026-10-13、共有基盤通知タスクの実装指示時）
