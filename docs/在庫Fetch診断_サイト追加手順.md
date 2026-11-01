# 在庫Fetch診断のサイト追加手順

## 目的

「在庫あり・なしをまとめて診断」の対象ECサイトと、在庫あり・在庫なしの比較サンプルを追加する手順です。

`src/config/stock-fetch-diagnosis-sites.json`は生成物です。直接編集せず、以下の入力を整えて同期スクリプトで更新します。

## 事前条件

1. `src/config/ec-sites.json`に対象サイトの`id`とURLホストに一致する`patterns`があることを確認します。
2. `~/Work/buy/Target/<対象フォルダー>/site_capture/`配下に、次の状態別URLファイルを用意します。

```text
02_product_in_stock/url.txt
03_product_out_of_stock/url.txt
```

各`url.txt`は`url:`行またはURLだけの行を使います。`title:`行は任意です。

```text
title: 商品名
url: https://example.com/product/123
```

## 追加手順

1. `scripts/sync-stock-fetch-diagnosis-samples.js`の`INITIAL_SITE_IDS`へ、`ec-sites.json`の対象`id`を追加します。

   ```js
   const INITIAL_SITE_IDS = new Set(['nissan', 'aeon', 'sevennet']);
   ```

2. リポジトリ直下で同期スクリプトを実行します。

   ```bash
   node scripts/sync-stock-fetch-diagnosis-samples.js
   ```

3. `src/config/stock-fetch-diagnosis-sites.json`に対象の`id`と、`in_stock`・`out_of_stock`の`sample`が追加されたことを確認します。
4. Chrome拡張を再読み込みし、popupを開き直します。
5. EC監視サイトで対象サイトだけをONにし、「在庫あり・なしをまとめて診断」を実行します。

## 同期の判定方法

同期スクリプトはTarget配下の各フォルダーにある`site_capture`を走査します。フォルダー名とsite IDを直接照合するのではなく、各`url.txt`のURLホストを`ec-sites.json`の`patterns`へ照合し、`INITIAL_SITE_IDS`に含まれるsite IDだけを生成JSONへ出力します。

そのため、対象サイトのURLホストが`patterns`に一致しない、または複数サイトに一致する場合はサンプルに取り込まれません。

## 追加後に一括診断を選べない場合

- 生成済みJSONに対象の`id`がない: 同期スクリプトを実行し、`INITIAL_SITE_IDS`、`url.txt`、`patterns`を確認します。
- 「診断サンプルが未登録」と表示される: 在庫あり・在庫なしの両方の`url.txt`とURL形式を確認します。
- ボタンが無効: EC監視サイトのONが対象サイト1件だけであることを確認します。
- 生成JSONを更新した直後: Chrome拡張を再読み込みし、popupを開き直します。
