# design.md

## 方針

- shared から同期済みの `src/config/page-recorder-targetpages.json` を popup が拡張内で読む。
- 単一URL監視の `single_config.settings.targetpage` に、ID・環境・サイトID・通知先拡張IDだけを保存する。
- targetpage 選択時に URL・セレクタ・キーワード・検知モードと外部通知先を設定する。利用者が URL または判定条件を手入力で変えた場合は targetpage 情報を解除する。
- 単一URLの検知時だけ、既存 `PAGE_RECORDER_STOCK_DETECTED` payload に `targetId`、`environment`、`eventId`、`detectedAt` を追加する。既存の一覧・定時監視通知は変更しない。
- AutoCartAgent 側の許可済み送信元・payload・URL検証、および既存 handler 起動は同日完了済みの受信実装を利用する。

## 検証

- PageRecorder: 通知 payload の互換性と targetpage 識別子追加を unit test で確認する。
- shared: 通知ライブラリを同期し、targetpage validator を利用可能にする。
- Chrome 手動E2E: test targetpage を選択して検知し、AutoCartAgent の既存 sevennet handler 起動まで確認する。
