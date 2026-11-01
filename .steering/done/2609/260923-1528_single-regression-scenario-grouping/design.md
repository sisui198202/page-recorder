# design.md

## 概要

`A: single` の既存8シナリオへ表示専用のグループ情報を付与し、選択リストを3つの`optgroup`として描画する。選択値は既存シナリオIDのままとし、設定保存、実行、background通信、判定状態の形式を変更しない。

## グループ定義

| ID | グループ |
| --- | --- |
| `appear` / `disappear` / `initial_detected` / `initial_not_detected` | 通常監視フロー |
| `keyword_missing_check` / `element_not_found_check` / `pending_error_check` | 設定・セレクタ診断 |
| `gmail_notification_check` | 通知連携 |

- グループ順は、通常監視フロー、設定・セレクタ診断、通知連携とする。
- グループ内の順序は既存の1〜8の順序を維持する。

## 実装方針

- `SINGLE_TEST_SCENARIOS` の各定義に表示用のグループIDを追加する。
- `popup.html` の初期`testScenarioSelect`は、上記定義どおりの`optgroup`を持つ静的HTMLへ置き換える。
- `popup.js` の `renderTestScenarioSelectOptions('single')` は、同じグループ定義を使って`optgroup`を生成する。`multiple` の選択肢生成は従来どおりフラットなままにする。
- optionの `value`、選択状態の復元、`renderTestScenarioPreview`、`startSelectedSingleTestScenario`、`startSingleIntegrationAutoTest` は変更しない。

## 変更対象

- `src/ui/popup.js`: グループ定義、single選択肢の描画。
- `src/ui/popup.html`: single初期表示の選択肢グループ。
- `tests/unit/popup-multiple-monitoring-resolution.test.js`: グループ対応、選択値・既存シナリオ契約、初期HTMLと動的描画の契約。

## テスト方針

- 8シナリオIDが既存どおりで、各グループへの所属と順序が正しいことを確認する。
- singleの初期HTMLと動的描画が、同じ`optgroup`ラベル・option値・順序を持つことを確認する。
- multipleの選択肢がグループ化されないこと、既存の選択値復元・自動判定判定・Gmailシナリオの既存テストが通ることを確認する。
- Chromeで`A: single`を開き、各グループから選択して説明・開始ボタン・自動判定/手動確認表示が従来どおり変わることを確認する。

## スコープ外

- ECサイト・登録URLの選択、選択サイトごとの固定設定・再現コードの生成。
- シナリオID、設定形式、background action、Gmail送信仕様の変更。
