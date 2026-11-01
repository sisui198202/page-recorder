# EC監視サイト：自動反映セレクタ選定基準

## PageRecorderの監視値

PopupのEC自動反映は、`selectors.productPage.pageRecorderMonitor` の`selector`と`keyword`を優先する。未設定サイトは従来の`inStock[0]`と`inStockText[0]`へフォールバックする。

監視値は、在庫あり・在庫なしの両方で商品本体内に存在し、要素の`textContent`から購入可能文言を判定できる組み合わせを選ぶ。0件はPageRecorderでセレクターエラーになるため、購入可能時だけ現れる要素を主監視対象にしない。

## 操作用との分離

`inStock`や`cartButton`は、購入可能性確認やクリックのための操作用候補として維持する。`button#buy:not([disabled])`のように在庫なし時に消える候補は、PageRecorderの継続監視には使わない。

## Premium Bandai

| 用途 | 値 |
| --- | --- |
| PageRecorder監視 | `div.cart` / `予約する` |
| 購入操作 | `button#buy:not([disabled])` |

`div.cart`は在庫あり・在庫なし・予約終了の各キャプチャで1件、商品本体外一致0件である。`予約する`は在庫ありにだけ含まれるため、出現検知に使う。

`alt`属性だけの`予約終了`は、現在のPopupが`textContent`で照合するため監視キーワードに使わない。
