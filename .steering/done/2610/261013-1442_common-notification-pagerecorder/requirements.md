# requirements.md

## 目的

PageRecorder の定時在庫差分検知における Chrome 通知と外部拡張送信を、shared の通知ライブラリへ移行する。

## 背景

- 共有通知基盤は AutoCartAgent で実機確認済みであり、PageRecorder でも同じ成功・失敗・通知IDの記録方式を使う。
- `PAGE_RECORDER_STOCK_DETECTED` の既存メッセージ契約と、監視本体を通知失敗で停止しない挙動を維持する。
- discord_post_url_monitor への共有基盤展開は今回の対象外とし、将来の別タスクで扱う。

## 受け入れ条件

- 定時在庫差分検知時に ChromeNotify 経由で既存と同じ内容の Chrome 通知を作成できる。
- 外部拡張への `PAGE_RECORDER_STOCK_DETECTED` 送信が ExternalMessaging 経由になり、既存 payload を維持する。
- B（単一URL監視）の外部通知設定で Discord チャンネルIDを保存し、discord_post_url_monitor 宛の payload に含められる。
- 送信先拡張が失敗応答を返した場合も成功扱いにせず、理由をログに残して監視・保存処理を継続する。
- 通知・送信の失敗時も在庫監視と保存処理を継続する。
- Chrome 実機確認の前提となる複数URL監視 B の即時開始で、開始不能な対象は成功扱いにせず、設定不整合の理由を表示する。

## 承認

- [x] ユーザー承認済み（2026-10-13、共有基盤通知タスクの対象変更時）
