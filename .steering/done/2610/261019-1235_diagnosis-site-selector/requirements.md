# 要件: 在庫Fetch診断のサイト選択化

## 目的

在庫Fetch一括診断の対象を、EC監視サイトのON/OFFではなく、専用のサイト選択欄で明示的に選べるようにする。

## 受け入れ条件

- 診断サンプルを持つサイトを専用プルダウンから選択できる。
- 選択したサイトだけを一括診断できる。
- 選択値はpopupを開き直しても復元される。
- `stock-fetch-diagnosis` の単体テストが新しい選択方式で成功する。

## 起点

- `src/ui/popup.html`、`src/ui/popup.js` の既存未コミット差分。
- `src/config/stock-fetch-diagnosis-sites.json` は `shared/scripts/sync-buy-urls.js` の生成結果と一致することを確認済み。
