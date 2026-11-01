# EC監視自動反映セレクタ適合化計画

## 目的

Popup のECサイト自動反映を、PageRecorder の「要素テキストにキーワードが出現すること」を継続監視できる値へ適合させる。

## 方針

- `productPage.inStock` は購入操作・在庫あり専用の候補として維持する。
- PageRecorder用に `productPage.pageRecorderMonitor`（`selector` / `keyword`）を追加し、Popup の単一・複数監視の自動補完はこれを優先する。
- `pageRecorderMonitor` がない既存サイトは、従来どおり `inStock` / `inStockText` をフォールバックに使う。
- Premium Bandai は `div.cart` / `予約する` を登録する。3状態のキャプチャで各1件、商品本体外一致0件を確認済みである。
- 購入操作用の `button#buy:not([disabled])` は変更しない。

## 検証

- Popup の自動補完と編集時のサイト同定が専用値を優先するユニットテストを追加する。
- 同項目がないサイトが既存値へフォールバックすることを確認する。
- shared master から `src/config/ec-sites.json` へ同期し、JSON構文とPremium Bandaiの値を確認する。
- Chromeで予約終了ページから監視を開始し、セレクターエラーにならず未検知で継続することを手動確認する。
