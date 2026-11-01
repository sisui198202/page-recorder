# 要件: 共有商品ターゲット選択UI

## 目的

PageRecorderの「商品ページURLを指定」で、AutoCartAgentと同じ共有商品ターゲットを環境・サイト名・商品名の順に選択できるようにする。

## 受け入れ条件

- shared正本の全商品ターゲットがPageRecorderへ同期される。
- 環境とサイト名で商品候補を絞り込める。
- 商品名に `🟢 在庫あり｜` または `⚪ 在庫なし｜` を表示する。
- 選択時のURL・監視条件・AutoCartAgent通知設定の既存動作を維持する。

## 起点

- `plan/todo.md` の共有商品ターゲットUI項目。
- ユーザー承認済みのAutoCartAgent相当UI方針。
