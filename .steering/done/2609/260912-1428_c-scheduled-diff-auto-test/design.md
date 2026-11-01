# design — c-scheduled-diff-auto-test

## 方針

- 既存の `scheduledWatchTestSession` と専用アラームを利用し、`mode: "multi-diff"` のみ二段階 tick とする。
- 初回 tick は一時タブで snapshot を取得し、先頭 URL を除いた `temporaryBaselineUrls` をテストセッションにだけ保存する。通常の snapshot/baseline 保存 API は呼ばない。
- 次の tick は同じ一時タブから再取得し、`diffStockProductUrls` で `newUrls` を計算する。検知後はタブ・アラーム・テストセッションを必ず片付ける。
- Gmail ON のときだけ開始前に既存 preflight を確認する。検知後は `notifyGmailForNewProductDetection` に実行 ID を渡し、保存済みの今回 ID の結果で判定する。
- popup は専用チェックボックスを local storage に保存し、差分テストの開始メッセージにのみ値を渡す。

## 非変更境界

`persistStockSnapshot`、本番 C セッション、`handleMultiSiteDetection`、ダウンロード、Chrome 通知、外部拡張通知は呼び出さない。
