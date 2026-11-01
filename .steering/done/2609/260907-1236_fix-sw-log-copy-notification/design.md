# design — fix-sw-log-copy-notification

## 方針

`copySwLogs()` を popup 内の名前付き async 関数として置く。関数は `getBufferedSwLogs` を要求し、成功時に `copyTextToClipboard()` へログ文字列を渡す。結果表示はすべて既存の `showMessage()` に統一する。

クリック listener は `copySwLogs()` だけを呼ぶ。これにより既存のコピー補助関数を再利用し、テストでは Chrome API、Clipboard API、メッセージ表示をモックして状態ごとの振る舞いを検証できる。

## 変更対象

- `src/ui/popup.js`
- `tests/unit/popup-multiple-monitoring-resolution.test.js`
- `tests/docs/sw-log-copy-manual-test.md`

## 非変更確認

- `getBufferedSwLogs` の action と background 応答形式を変えない。
- `copyTextToClipboard()` の既存フォールバックを変更しない。
