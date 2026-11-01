# 要件: EC監視自動反映セレクタ適合化

## 目的

ECサイトを1件選択したとき、PageRecorderが在庫なし状態でもセレクターエラーで停止せず、購入可能文言の出現を継続監視できる初期値を自動補完する。

## 背景

Premium Bandaiの`button#buy:not([disabled])`は購入操作には正しいが、予約終了では0件となる。PageRecorderは0件をエラー停止するため、常在する`div.cart`と`予約する`を監視用に分離する必要がある。

## 受け入れ条件

- `pageRecorderMonitor` が設定されたサイトは、その`selector`と`keyword`をsingle・multipleの自動補完と編集時のサイト同定に使う。
- 未設定サイトは従来の`inStock` / `inStockText`を使い、既存設定を壊さない。
- Premium Bandaiは`div.cart` / `予約する`を使い、在庫あり・在庫なし・予約終了のキャプチャで`div.cart`が各1件である根拠を文書化する。
- `button#buy:not([disabled])`は操作・購入可能性の候補として維持する。

## 承認

- 2026-09-21: ユーザーが提案内容と共有スキル／共有サイト定義の更新を承認。
