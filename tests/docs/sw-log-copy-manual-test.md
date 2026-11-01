# SWログコピーの手動テスト

## 目的

- popup の「SWログをコピー」が Service Worker のバッファ内容をコピーし、既存メッセージ領域で成功を知らせることを確認する。
- Clipboard API の利用可否にかかわらず、既存のコピー処理を通ることを確認する。

## 実行

1. `~/Work/chromeExtensions/PageRecorder` を Chrome の拡張機能管理画面で再読み込みする。
2. 拡張の popup を開き、「SWログをコピー」をクリックする。
3. テキストエディタなどに貼り付ける。

## 期待結果

- popup の既存メッセージ領域に「`N件のSWログをコピーしました`」またはログがない場合でも成功メッセージが表示される。
- 貼り付け内容が Service Worker のログを改行で連結した文字列、または `(ログなし)` である。
- popup の DevTools Console に `showStatusMessage is not defined` が出ない。
