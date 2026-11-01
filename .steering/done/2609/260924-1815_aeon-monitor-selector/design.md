# 設計: イオン在庫監視セレクター更新

## 承認

- [x] ユーザー承認済み（2026-09-24）

## 採用する監視条件

イオンスタイルオンラインの`selectors.productPage`へ、購入操作条件とは独立した次の`pageRecorderMonitor`を追加する。

```json
"pageRecorderMonitor": {
  "selector": "#ctl00_ContentPlaceHolder1_upUpdatePanel .product__cart",
  "keyword": "カートに入れる"
}
```

PageRecorderはこの専用設定を優先して、単件・一括のFetch診断に渡す。既存の`cartButton`、`inStock`、`soldOut`とその文言は変更しない。

## 更新経路

1. 共有正本`~/Work/chromeExtensions/shared/ec-sites-master.json`のAeon定義へ`pageRecorderMonitor`を追加する。
2. Targetの`aeon_site_structure`で、PageRecorder向けの監視条件として同じセレクター・キーワードと状態別の選定根拠を記録する。既存の購入フロー用セレクターは変更しない。
3. 共有同期スクリプトでPageRecorderの`src/config/ec-sites.json`を生成・反映する。
4. PageRecorderの設定取得テストと、保存済み診断成果物に対する照合を実行する。

共有正本とTargetはこのリポジトリ外にあり、同期スクリプトは他の拡張機能も更新し得るため、実装開始時に書き込み実行の承認を得る。

## 検証

- 設定取得でAeonの既定値が`pageRecorderMonitor`から返ることをテストする。
- 2026-09-24の在庫あり2件・在庫なし1件のFetch HTML・outerHTMLで、セレクター一致数とキーワード判定を確認する。
- Chromeで一括診断を再実行し、3件すべてが`FETCH_SUPPORTED`になることを手動確認する。
