# decisions — fix-sw-log-copy-notification

## 既存の popup ヘルパーを再利用する

- 採用: `showMessage()` と `copyTextToClipboard()` を利用する。
- 理由: 前者は popup の既存メッセージ領域を使い、後者は Clipboard API 非対応時のフォールバックを既に持つため。
- 不採用: `showStatusMessage()` の新規実装、個別の Clipboard API 呼び出し。未定義参照を温存し、コピー経路の互換性を分散させるため。
