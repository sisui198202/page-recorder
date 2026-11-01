# tasks.md

## Phase 1: 共有基盤の展開

- [x] shared 同期設定を PageRecorder 対象へ更新し、notification モジュールを同期する。
- [x] Service Worker で IIFE 版の通知モジュールを読み込む。

## Phase 2: PageRecorder の移行

- [x] 定時在庫差分検知の Chrome 通知を ChromeNotify に移行する。
- [x] PAGE_RECORDER_STOCK_DETECTED の外部送信を ExternalMessaging に移行する。
- [x] 通知・送信失敗を bgLogWarn で記録し、監視処理を継続する。

## Phase 3: 検証

- [x] Chrome 実機確認の前提として、複数URL B の即時開始失敗を理由付きで表示し、設定不整合対象を選択不可にする。
- [x] popup と background で B プロファイルの解決元を統一し、buy-target プロファイルを即時監視に利用できるようにする。
- [x] B 対象一覧の再描画時に、即時監視の選択状態を保持する。
- [x] B 即時監視中は、popup 再表示後でも選択なしで停止できるようにする。
- [x] Chrome 実機で B 即時監視の開始・手動停止を確認する。
- [x] B の在庫検知Chrome通知を、検知ファイルのダウンロードより先に作成する。
- [x] B の外部通知設定でDiscordチャンネルIDを保存し、検知payloadへ引き継ぐ。
- [x] 外部拡張の失敗応答を成功扱いにせず、理由をログへ記録する。
- [x] shared 通知モジュールと PageRecorder の関連テスト、構文・差分チェックを実行する。
- [x] Chrome 実機で定時在庫差分通知の表示を確認する。
- [x] Chrome 実機でBからdiscord_post_url_monitorへの外部送信を確認する。
- [x] 手動確認結果を ai-notes.md とルート共有通知タスクへ同期する。
