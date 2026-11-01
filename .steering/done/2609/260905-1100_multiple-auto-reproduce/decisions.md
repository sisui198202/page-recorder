# decisions — multiple-auto-reproduce

## popupのコード文字列を実行しない

popupの再現コードは利用者向け表示専用とし、backgroundでは固定のDOM変更関数だけを `chrome.scripting.executeScript` で実行する。開始メッセージを改変されても任意コードを実行しないためである。

## 失敗はtab単位で隔離する

2 URLの回帰確認では一方の失敗がもう一方の結果を隠さないよう、注入失敗したtabだけを停止する。
