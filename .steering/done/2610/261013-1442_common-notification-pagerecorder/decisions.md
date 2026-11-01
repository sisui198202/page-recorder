# decisions.md

## D-001: PageRecorder は通知作成と外部送信を共有化する

- Chrome 通知は ChromeNotify、外部送信は ExternalMessaging を使用する。
- 既存のメッセージ契約を変えず、通知処理の成功・失敗を一貫して扱うため。

## D-002: discord_post_url_monitor は今回の対象外

- 同拡張への共有基盤展開は将来の別タスクで扱う。
