# tasks — fix-sw-log-copy-notification

## Phase 1: 特性テスト

- [x] SWログの取得・コピー成功時のメッセージを確認する。
- [x] ログ取得失敗時とコピー失敗時のエラー表示を確認する。
- [x] Clipboard API 非対応時の既存フォールバックを確認する。

## Phase 2: 実装

- [x] SWログコピー処理を `copyTextToClipboard()` と `showMessage()` に統一する。
- [x] 未定義の `showStatusMessage()` 参照を除去する。

## Phase 3: 検証

- [x] 関連 Jest、`npm run check:plan-todo`、`git diff --check` を実行する。
- [x] Chrome でコピー内容と popup 表示を手動確認する。
