# 設計: 共有商品ターゲット選択UI

- sharedの `product-targets-master.json` からPageRecorderの配布設定を生成する専用同期スクリプトを追加する。
- popupの共有targetpage欄を環境、サイト名、商品名の3選択欄にする。
- サイト名は `ec-sites.json` の表示名、商品名は `title` 優先・`name` 後退で表示する。
- `state` が `in_stock` / `out_of_stock` の商品に状態ラベルを付け、未設定は従来名で表示する。
- 手入力・prod確認・通知連携解除の既存仕様は変更しない。
