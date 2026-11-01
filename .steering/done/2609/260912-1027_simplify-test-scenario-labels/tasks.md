# tasks — simplify-test-scenario-labels

起点: `plan/todo.md` のテストシナリオ選択表示の簡略化項目。

## Phase 1: 選択肢ラベルの統一

- [x] `popup.html` の single 初期表示7件から「【自動判定対応】」を削除する。
- [x] `popup.js` の `SINGLE_TEST_SCENARIOS` の7件を、初期HTMLと同じラベルにする。
- [x] `supportsAutoJudgement`、シナリオ ID、自動判定処理に変更がないことを確認する。

## Phase 2: 契約テスト

- [x] 全7シナリオの自動判定対応と、HTML・JSにバッジがないことを検証する契約テストへ更新する。
- [x] 対象ユニットテストを実行し、自動判定の開始契約を確認する（2026-09-12: 対象37件、全219件が成功）。

## Phase 3: Popup 確認

- [x] Chrome で A: single のプルダウンを開き、7件にバッジがなく選択・適用できることを確認する（2026-09-12: ユーザー提示スクリーンショットで7件のバッジ非表示を確認）。

## 完了条件

- [x] 実装・自動テスト・Chrome 手動確認の結果を進捗文書に同期する。
