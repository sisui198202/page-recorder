# 要件: イオン在庫監視セレクター更新

## 目的

イオンスタイルオンラインの在庫あり・在庫なしを、PageRecorderの一括Fetch診断で同じ商品本体内セレクターにより比較できるようにする。

## 背景

2026-09-24の一括診断では、既定の`#ctl00_ContentPlaceHolder1_lbCartAdd`が在庫なしで0件となり、`NEEDS_REVIEW`になった。保存済みのFetch HTML・outerHTMLでは、`#ctl00_ContentPlaceHolder1_upUpdatePanel .product__cart`が全3サンプルで各1件あり、`カートに入れる`は在庫ありだけにあった。

## 要件

- イオン向けのPageRecorder診断既定値を、在庫あり・在庫なしの両方に残る商品本体内の監視領域と、在庫ありだけにあるキーワードで定義する。
- 共有ECサイト正本、Targetの構造定義、PageRecorderの配布コピーを同じ判断結果へ同期する。
- 既存の購入操作用`cartButton`、`inStock`、`soldOut`の意味を変更しない。
- 既存の在庫診断サンプル生成と一括診断フローを維持する。

## 受け入れ条件

- 在庫あり2件・在庫なし1件の保存済みFetch HTMLとouterHTMLで、採用セレクターが各1件一致する。
- 採用キーワードは在庫あり2件で一致し、在庫なし1件で不一致となる。
- 一括診断の再実行で、同じ3サンプルが`FETCH_SUPPORTED`となる。
- 共有正本・PageRecorder配布コピー・Target構造定義の値が整合する。

## スコープ外

- Fetch単独監視への切替、在庫API調査、購入操作セレクターの変更。

## 承認

- [x] ユーザー承認済み（2026-09-24）
