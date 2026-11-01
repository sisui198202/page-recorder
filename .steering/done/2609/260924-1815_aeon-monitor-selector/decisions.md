# decisions

## D-001: PageRecorder診断条件を購入操作条件から分離する

- 状態: 採用済み（2026-09-24）
- 採用案: `#ctl00_ContentPlaceHolder1_upUpdatePanel .product__cart` / `カートに入れる`
- 根拠: 2026-09-24の在庫あり2件・在庫なし1件のFetch HTMLとouterHTMLで、各状態に1件ずつ一致し、キーワードは在庫ありだけに存在した。
- 方針: 共有正本の`pageRecorderMonitor`として追加し、同期スクリプトでPageRecorder配布コピーへ反映した。既存の購入操作・自動カート用設定は変更しない。

## D-002: offscreen宛てメッセージをbackgroundで応答しない

- 状態: 採用済み（2026-09-24）
- 根拠: `OFFSCREEN_ANALYZE_STOCK_HTML`はruntimeイベントを共有するため、backgroundの`default`応答がoffscreen解析結果との競合を起こし、`不明なアクション`になった。
- 方針: `target: "offscreen"`をbackground listenerの先頭で無視し、offscreen documentだけが応答する。
