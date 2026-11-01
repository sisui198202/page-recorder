# 偽セブンネット商品ページ

PageRecorder のテストタブを、実在ECサイトに接続せず手動確認するためのローカルHTTPサーバーです。外部リソース、フォーム送信、カート投入は行いません。

## 起動

PageRecorder リポジトリのルートで実行します。

```bash
node tests/fake-ec/server.js
```

既定ポートは `4173` です。変更する場合は `PORT` を指定します。

```bash
PORT=4174 node tests/fake-ec/server.js
```

ポートを変更した場合は、テストタブ用サンプルURLも同じポートに一時的に合わせてください。既定ポートのまま使うことを推奨します。

## URL一覧

| 状態 | URL | カートボタンの文言 |
| --- | --- | --- |
| 在庫あり | `http://localhost:4173/sevennet/detail/1000000001.html?stock=in` | カートに入れる |
| 在庫あり | `http://localhost:4173/sevennet/detail/1000000005.html?stock=in` | カートに入れる |
| 在庫なし | `http://localhost:4173/sevennet/detail/1000000002.html?stock=out` | 予約受付終了 |
| 在庫なし | `http://localhost:4173/sevennet/detail/1000000003.html?stock=out` | 在庫なし |
| 在庫なし | `http://localhost:4173/sevennet/detail/1000000004.html?stock=out&out=reservation` | 予約受付終了 |

在庫判定要素は、実際のセブンネットのキャプチャと同じ `button.add-to-cart.c-btnCartin.js-add-to-cart` です。在庫なしでは同ボタンに `disabled` 属性を付けます。ボタンは `type="button"` で、クリック時も遷移・送信しません。

## PageRecorder での利用

1. このサーバーを起動したまま、`chrome://extensions` で PageRecorder を再読み込みします。
2. popup の「テスト」タブで、テストサイト **「【テスト専用】偽セブンネットショッピング（localhost）」** を選びます。
3. A: single または A: multiple のシナリオを実行します。A: multiple は在庫あり・在庫なしをそれぞれ2件以上登録しているため、開始状態に応じて異なる2 URLで実行できます。

`manifest.json` の既存 `<all_urls>` 権限は `http://localhost:4173/*` を含み、テスト専用ECサイト定義の `localhost` パターンが照合に使われます。
