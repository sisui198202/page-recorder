# design — multiple-manual-appear-two-urls

## 設計

- `MULTIPLE_TEST_SCENARIOS` に `manual_appear_two_urls` を追加する。
- 既存の 6710 URL と `?ref=multi` URL、出現検知、開始直後判定OFFを使う。
- `NISSAN_TEST_MANUAL_APPEAR_CODE` を再利用し、各監視タブで実行する旨を説明する。
- `reloadWaitAfterReload` は共通設定と2つの各設定で15秒にする。
- background の未知 `scenarioId` 向け手動再現コード案内をそのまま利用する。

## 非対象

- background の待機・検知・保存処理
- コピー操作
- `single` シナリオと既存 `multiple` 正常系3本の設定変更
