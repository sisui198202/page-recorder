# decisions

- `pageRecorderMonitor`は`productPage`配下の任意オブジェクトとする。PageRecorder固有の用途を`inStock`（共通の購入可能性候補）と混同しないため。
- 未設定サイトは従来の`inStock` / `inStockText`へフォールバックし、既存サイトの挙動を維持する。
