# requirements — fix-sw-log-copy-notification

## 目的

popup の「SWログをコピー」で、成功・ログ取得失敗・コピー失敗を既存メッセージ領域へ正しく表示できるようにする。

## 背景

2026-09-07 に、当該クリック処理が未定義の `showStatusMessage()` を参照し、状態通知時に例外となることを確認した。既存の `copyTextToClipboard()` は Clipboard API 非対応時のフォールバックを実装済みであるが、当該処理はこれを利用していない。

## 機能要件

- Service Worker のログ取得成功後、既存メッセージ領域にコピー成功を表示する。
- `getBufferedSwLogs` が失敗した場合、既存メッセージ領域にエラーを表示する。
- クリップボード書き込みが失敗した場合、元エラーをコンソールへ記録し、既存メッセージ領域にエラーを表示する。
- クリップボード書き込みは `copyTextToClipboard()` を利用する。

## 非機能要件・スコープ外

- Service Worker のログ取得仕様・バッファ内容は変更しない。
- 監視ロジック、background I/O、外部拡張通知、storage は変更しない。
- 進行中の `extract-message-handlers` task には含めない。

## 受け入れ条件

- 自動テストで成功、取得失敗、コピー失敗を確認できる。
- Chrome でコピー内容と popup の表示を確認できる。
