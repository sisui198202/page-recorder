# 設計: 偽セブンネット商品ページ

## 方針

`tests/fake-ec/server.js` は Node.js 標準ライブラリの HTTP サーバーで、商品詳細URLだけを動的にHTMLとして返す。外部リソースは読み込まない。商品IDとクエリにより状態を決めるため、同一のサーバーで複数URLを使える。

## DOM契約

キャプチャ元の在庫判定要素を保持する。

| 状態 | セレクタ | 属性・文言 |
| --- | --- | --- |
| 在庫あり | `button.add-to-cart.c-btnCartin.js-add-to-cart` | disabled なし、`カートに入れる` |
| 在庫なし | 同上 | `disabled` あり、`予約受付終了` または `在庫なし` |

カートボタンは `type="button"` とし、クリックイベントで `preventDefault()` する。フォーム・ネットワーク処理は置かない。

## PageRecorder 設定

- `ec-sites.json` に `fake-sevennet-local` を追加する。`patterns` は `localhost` と `127.0.0.1`、監視セレクタ・キーワードは既存セブンネットと同じにする。
- `stock-fetch-diagnosis-sites.json` にローカルURLを追加する。在庫あり2件以上、在庫なし3件以上とし、テストタブの A: multiple が開始状態ごとに異なるURLを2件選べるようにする。
- 既存 `sevennet` の定義・サンプルは変更しない。

## host_permissions とパターン照合

- manifest の既存 `<all_urls>` は `http://localhost:4173/*` を含むため、権限追加は不要。
- popup の照合は URL の `hostname` と `patterns` を比較する。ポートは比較対象でないため、`localhost` の登録で `localhost:4173` に一致する。

## 変更対象

- 新規: `tests/fake-ec/server.js`、`tests/fake-ec/README.md`
- 修正: `src/config/ec-sites.json`、`src/config/stock-fetch-diagnosis-sites.json`、`tests/unit/popup-test-tab-site.test.js`、`tests/docs/テストタブ本番経路シナリオの手動テスト.md`

## テスト方針

- Node.jsでサーバーを起動し、在庫あり・在庫なしURLを `curl` してDOMとステータスを確認する。
- JSON構文、設定からのテスト候補、`localhost` のパターン照合をJestで確認する。
- `npm test` を実行する。Chrome拡張での A: single / A: multiple の実機操作は利用者が行う。
