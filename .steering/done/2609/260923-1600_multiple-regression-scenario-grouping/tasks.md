# tasks.md

## ステータス

- [x] requirements.md 承認済み（2026-09-23）
- [x] design.md 承認済み（2026-09-23）
- [x] tasks.md 承認済み（2026-09-23: 提示済み実装計画を承認）

## Phase 1: シナリオ定義と選択UIの分類

- [x] multiple用の2グループ定義を追加する。
- [x] 7シナリオへ表示用のグループIDを追加する。
- [x] `renderTestScenarioSelectOptions('multiple')`を2つの`optgroup`で描画する。
- [x] 選択値復元、プレビュー、開始、自動再現、Gmail判定の既存経路を変更しない。

## Phase 2: 契約テスト

- [x] 7シナリオの所属・既存順・診断グループ非表示を確認するテストを追加する。
- [x] 動的描画が2グループの順で全7 option を保持するテストを追加する。
- [x] A: single分類、multiple開始、Gmail関連を含む関連テストを実行する（2026-09-23: 113 tests passed）。

## Phase 3: 検証と手動受け入れ

- [x] JavaScript構文検査、関連Jest、`git diff --check`、`npm run check:plan-todo`を実行する（2026-09-23: 全291 tests passed）。
- [x] Chromeで各グループから1件を選び、説明・開始表示・popup再表示後の選択値復元を確認する（2026-09-23: ユーザーがスクリーンショットで表示を確認し、OKと承認）。

## スコープ外

- [/] 診断シナリオの追加。
- [/] シナリオID、番号・ラベル、固定設定、background action、Gmail送信条件の変更。
