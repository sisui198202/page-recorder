# A: multiple 回帰シナリオ分類改善

## 目的

`A: multiple` の既存7シナリオを目的別に整理し、実行したい回帰観点を選びやすくする。

## 背景

既存の複数URLシナリオは通常監視とGmail通知が同じ選択リストに並ぶ。設定・セレクタ診断用のシナリオは存在しないため、空の分類を増やさず表示だけを2グループ化する。

## 計画

- `MULTIPLE_TEST_SCENARIOS` の全7定義に表示専用の `groupId` を持たせる。
- `testScenarioSelect` の `multiple` 動的描画を「通常監視フロー」「通知連携」の順の `optgroup` にする。
- 選択値、プレビュー、開始、自動DOM再現、Gmail判定・送信条件は変更しない。
- IDの所属と順序、動的描画の全option保持を契約テストで固定する。

| グループ | 対象シナリオ |
| --- | --- |
| 通常監視フロー | `baseline_two_urls`、`initial_detected_two_urls`、`initial_not_detected_two_urls`、`manual_appear_two_urls`、`duration_elapsed_during_reload_wait` |
| 通知連携 | `gmail_notification_one_url`、`gmail_notification_two_urls` |

## 受け入れ条件

- A: multiple の7シナリオを上記2グループとして表示する。
- シナリオID、番号・ラベル、固定設定、background action、Gmail送信条件を変更しない。
- 空の「設定・セレクタ診断」グループを表示しない。
- popup再表示後に保存済みシナリオIDを従来どおり復元できる。

## スコープ外

- 診断シナリオの追加。
- 監視ロジック、設定形式、background action、Gmail送信仕様の変更。
