# done.md — イオン在庫監視セレクター更新

## 完了情報

| 項目 | 内容 |
| --- | --- |
| 完了日時 | 2026-09-24 19:05 JST |
| 作業ブランチ | `feature/aeon-monitor-selector` |
| マージ先 | `main` |
| main反映コミット | `24a24c88117bfb000b6d32970e96e6ca328be6e4` |
| 主な修正コミット | `e116513`、`6ebd65c` |
| 削除したブランチ | `feature/aeon-monitor-selector`（local） |

## 変更概要

- AeonのPageRecorder診断既定値として、商品本体領域`#ctl00_ContentPlaceHolder1_upUpdatePanel .product__cart`とキーワード`カートに入れる`を追加した。
- 購入操作用の`cartButton`、`inStock`、`soldOut`は変更せず、専用の`pageRecorderMonitor`として分離した。
- offscreen解析メッセージをbackgroundが誤応答する競合を解消した。
- 共有ECサイト正本・Target構造定義・PageRecorder配布コピーを同期した。共有・Target側の変更は外部作業ツリーの既存差分に混在するため、このリポジトリではコミット対象外とした。

## 確認結果

- `npm test -- --runInBand`: 13 suites、311 tests 成功。
- `npm run check:plan-todo`、`git diff --check` 成功。
- ChromeでAeonのみを有効にして一括診断を実行し、run `stock-fetch-20260924190308-zt3s5m` が`FETCH_SUPPORTED`となった。
- 在庫ありはFetch/DOMとも2/2、在庫なしはFetch/DOMとも1/1で期待値を満たした。

## README / 計画整理

- READMEに在庫Fetch診断の手動確認手順への導線を追加した。
- `plan/todo.md`から完了項目を削除し、計画書を`docs/実装済/`へ移動した。

## 残課題

- Fetch単独監視への切替、在庫API調査、購入操作用セレクターの変更は対象外。

## ルール更新提案

- 更新不要。offscreen宛てruntimeメッセージをbackgroundで応答しない判断は、回帰テストと`decisions.md`に記録済みであり、共通ルール化が必要な再発事例ではない。
