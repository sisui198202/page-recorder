# decisions — gmail-detection-notifications

## D-001: Gmail 送信は background に一元化する

- 決定内容: OAuth、MIME 生成、Gmail API 呼出し、送信結果保存は `background.js` に置く。
- 理由: popup は UI と操作トリガーだけに保ち、A/B/C の検知経路で同じ送信処理を再利用するため。

## D-002: 本番検知では非対話認証だけを使う

- 決定内容: popup のテスト送信だけ interactive 認証を許可し、監視検知は既存トークンを非対話で取得する。
- 理由: alarm・監視中に OAuth ダイアログを出さず、監視フローを停止させないため。

## D-003: テスト起点は runtime の明示フラグで送信を抑止する

- 決定内容: `suppressGmailNotification` をテスト起点の runtime settings/session だけに付与し、永続設定に保存しない。
- 理由: 本番設定への混入と、テストによる実メール送信を防ぐため。

## D-004: B安全テストのGmail検知確認は対象外とする

- 決定内容: 指定URLの商品取得だけを確認するB安全テストでは、Gmail検知送信を確認しない。
- 理由: Bのターゲットセレクタが未確定であり、検知再現の前提を満たせないため。本番B監視のGmail通知仕様は変更しない。
