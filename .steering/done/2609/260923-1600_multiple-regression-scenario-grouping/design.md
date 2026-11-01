# design.md

## 概要

`MULTIPLE_TEST_SCENARIOS` に表示専用の `groupId` を追加し、`renderTestScenarioSelectOptions('multiple')` を2つの `optgroup` で描画する。optionの value は既存IDのままとする。

## グループ定義

| ID | グループ |
| --- | --- |
| `baseline_two_urls` / `initial_detected_two_urls` / `initial_not_detected_two_urls` / `manual_appear_two_urls` / `duration_elapsed_during_reload_wait` | 通常監視フロー |
| `gmail_notification_one_url` / `gmail_notification_two_urls` | 通知連携 |

- グループ順は通常監視フロー、通知連携とする。
- グループ内の順序は既存の1〜7を維持する。
- 診断シナリオがないため、診断グループを定義・描画しない。

## 実装方針

- `MULTIPLE_TEST_SCENARIO_GROUPS` を表示順の唯一の定義として追加する。
- Gmailシナリオ生成関数は `groupId` を受け取り、返却定義へ保持する。
- `renderTestScenarioSelectOptions` はsingle/multipleのグループ定義を選択して描画し、その他のモードは既存のフラット描画を維持する。
- 選択値の復元、`renderTestScenarioPreview`、`startSelectedMultipleTestScenario`、自動再現、Gmail判定は変更しない。

## 変更対象

- `src/ui/popup.js`: multiple用のグループ定義、各シナリオの表示メタデータ、選択肢描画。
- `tests/unit/popup-multiple-monitoring-resolution.test.js`: 7件の所属・順序と動的描画の契約。

## テスト方針

- 7 IDの所属と既存順を確認する。
- 2グループが指定順で全7 option を含み、診断グループがないことを確認する。
- 既存のsingle分類、multiple開始、Gmail関連テストを実行する。
