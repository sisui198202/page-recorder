# 設計: EC監視自動反映セレクタ適合化

## データ契約

`selectors.productPage.pageRecorderMonitor` を任意オブジェクトとして追加する。

```json
{ "selector": "div.cart", "keyword": "予約する" }
```

Popupは有効な文字列の`pageRecorderMonitor`を優先し、欠けている場合だけ`inStock[0]` / `inStockText[0]`へフォールバックする。

## 処理

- 共通の既定値解決関数を追加し、single自動補完、multiple追加モーダル、編集時のサイト同定で同じ値を使用する。
- shared masterのPremium Bandaiだけに専用値を登録し、同期スクリプトでPageRecorderの配布コピーを更新する。
- `ec-select-monitor-selectors`には、PageRecorder利用時は在庫あり・なしの両方で残る監視領域と`textContent`キーワードを選ぶ規則を追加する。

## 非対象

- 0件の在庫あり専用セレクターを通常の未検知として扱う監視エンジン変更。
- 属性（`alt`、`disabled`）専用の判定方式追加。
