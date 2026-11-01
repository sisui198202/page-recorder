# tasks.md

## ステータス

- [x] requirements.md 承認済み（2026-09-23）
- [x] design.md 承認済み（2026-09-23）
- [x] tasks.md 承認済み（2026-09-23）

## Phase 1: シナリオ定義と選択UIの分類

- [x] `SINGLE_TEST_SCENARIOS` の8件へ表示用グループIDを追加する。
- [x] 初期HTMLの`testScenarioSelect`を、3つの`optgroup`と既存のoption値・順序へ置き換える。
- [x] `renderTestScenarioSelectOptions('single')`を同じグループ定義で描画し、`multiple`のフラット表示は維持する。
- [x] 選択値の復元、説明表示、開始・自動判定の既存経路を変更しない（既存経路の変更なし）。

## Phase 2: 契約テスト

- [x] 8シナリオIDと、通常監視フロー（1〜4）・設定/セレクタ診断（5〜7）・通知連携（8）の所属・順序を確認するテストを追加する。
- [x] 初期HTMLとsingleの動的描画が同じ`optgroup`・option値を持つことを確認する。
- [x] multipleの選択肢が従来どおりフラットであること、および既存の自動判定・Gmail関連テストが通ることを確認する。

## Phase 3: 検証と手動受け入れ

- [x] Jest全体、JavaScript構文検査、`git diff --check`を実行する（2026-09-23: 290 tests passed）。
- [x] Chromeで`A: single`を開き、3グループと1〜8の順序を確認する。
- [x] 各グループから1件以上選択し、説明・開始ボタン・自動判定/手動確認の表示が従来どおり切り替わることを確認する（通常監視フロー: シナリオ1の自動判定は合格、2026-09-23）。
- [x] popup再表示後に選択済みシナリオが同じIDで選択されることを確認する。

## スコープ外

- [/] ECサイト・登録URLの選択と、サイト別の固定設定・再現コード生成。
- [/] シナリオID、設定形式、background action、Gmail送信仕様の変更。
