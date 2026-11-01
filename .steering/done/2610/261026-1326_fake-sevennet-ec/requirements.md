# 偽セブンネット商品ページによるローカル手動テスト

## 目的

実在ECサイトへアクセスせず、PageRecorder のテストタブにある A: single / A: multiple の手動受け入れ確認を Mac 内だけで実行できるようにする。

## 背景

既存のテストサイト候補は実サイトのURLを使うため、在庫状態や外部サイトの可用性に手動テストが左右される。セブンネットのキャプチャ済みDOMと同じ在庫判定要素を localhost で再現する。

## 機能要件

- `tests/fake-ec/` に Node.js だけで起動できる偽セブンネット商品ページを置く。
- `http://localhost:4173/sevennet/detail/<id>.html?stock=in` は、`button.add-to-cart.c-btnCartin.js-add-to-cart` を disabled なし・文言「カートに入れる」で返す。
- 異なる商品IDの在庫ありURLを2件以上用意し、A: multiple の在庫あり開始シナリオを実行できる。
- `stock=out` は同じボタンを disabled 付きで返し、商品IDまたはパラメータで「予約受付終了」「在庫なし」の両方を返せる。
- 在庫なしURLを3件以上用意し、カートボタンは送信・遷移を行わない。
- テストタブの候補に、既存の本番セブンネットとは別の localhost 専用サイトを追加する。
- 本番サイトの監視定義・既存サンプルを変更しない。

## 受け入れ条件

- [x] README のコマンドでローカルサーバーを起動できる。
- [x] 在庫あり・在庫なしのDOMがセブンネットの既存在庫判定セレクタに一致する。
- [x] 異なる在庫ありURLが2件以上、在庫なしURLが3件以上あり、A: multiple の全2 URLシナリオを実行できる。
- [x] テストタブで localhost 専用サイトを選択できる。
- [x] `npm test` が通る。

## 制約・スコープ外

- キャプチャ元 `~/Work/buy/Target/セブンネットショッピング/site_capture/` は読取専用とし、変更しない。
- 実在サイトの既存定義・本番監視設定・外部リソースは変更しない。
- 実装・検証フェーズでは git commit、push、branch削除、`.steering/done/` へのアーカイブを行わない。受け入れ確認後、ユーザーが完了処理を明示承認した場合だけ実施する。

## 起点台帳

- リポジトリ: `PageRecorder`
- 対象: `tests/fake-ec/`、`src/config/ec-sites.json`、`src/config/stock-fetch-diagnosis-sites.json`、テストタブ手動テスト文書

## 承認

- [x] ユーザー依頼で要件提示済み（2026-10-26）
