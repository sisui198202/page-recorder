# tasklist — AEON 一覧 商品URL収集・差分通知

## Phase 1: steering

- [x] requirements / design / tasklist 作成

## Phase 2: 実装

- [x] `normalizeStockProductUrl` 追加
- [x] `captureScheduledSnapshot` AEON 一覧セレクタ更新
- [x] `runScheduledStockCheck` URL 差分と通知対象の絞り込み
- [x] `logEntry.newUrls` 追加
- [x] `self.runScheduledStockCheck` を SW 手動確認用に公開

## Phase 3: 確認

- [x] 一覧コンソール: 代表リンク数 = `li.product__item` 数
- [x] 1回目 `runScheduledStockCheck` で snapshot.urls が埋まる
- [x] 2回目（1件増）で newUrls が1件・discord へその URL のみ

## Phase 4: ドキュメント

- [x] SW 手動テスト手順: `tests/aeon-scheduled-stock-check-sw-manual.md`
