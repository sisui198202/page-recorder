# SWログコピー通知エラーの修正

## 背景

popup の「SWログをコピー」は、Service Worker のバッファ内容を手動調査用にコピーする導線である。状態通知に未定義の `showStatusMessage()` を使い、取得失敗・コピー成功・コピー失敗時に例外となっていた。また、他のコピー導線と異なり、既存のクリップボード互換フォールバックを利用していなかった。

## 実装

- `copySwLogs()` を追加し、クリック listener から呼び出す形に整理した。
- 状態表示を既存の `showMessage()` へ統一した。
- コピーを `copyTextToClipboard()` 経由にし、Clipboard API 非対応時にも既存フォールバックを使うようにした。

## 確認結果

- Jestで成功、ログ取得失敗、コピー失敗、Clipboard API 非対応時のフォールバックを確認した。
- Chromeで「SWログをコピー」を実行し、Service Workerログのコピー成功とエラー未発生を確認した。
