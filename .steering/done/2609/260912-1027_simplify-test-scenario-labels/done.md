# done — simplify-test-scenario-labels

## 完了日時

2026-09-12

## 対象タスク

A: single のテストシナリオ選択肢から「【自動判定対応】」を削除し、初期表示とモード切替後の表示を統一する。

## Git

- 作業ブランチ: `feature/simplify-test-scenario-labels`
- merge 先: `main`
- 実装コミット: `777401a feat: simplify test scenario labels`
- 手動確認記録: `d983094 docs: record scenario label manual check`
- close 整理: `09fde63 docs: close scenario label task`
- main 反映: `09fde63`
- 削除済みブランチ: `feature/simplify-test-scenario-labels`

## 変更概要

- `popup.html` と `SINGLE_TEST_SCENARIOS` の全7ラベルからバッジを削除した。
- 自動判定対応フラグ、シナリオ ID、実行・結果表示ロジックを維持した。
- バッジ非表示と全7件の自動判定対応を検証する契約テストへ更新した。

## 確認結果

- `npm test -- --runInBand`: 219件成功。
- `npm run check:plan-todo`: 成功。
- `git diff --check`: 成功。
- Chrome 手動確認: ユーザー提示スクリーンショットで A: single の7件にバッジがないことを確認し、OK を受領。

## README / plan 整理

- README: テストタブの簡潔な選択肢表示を反映。
- `plan/todo.md`: 完了項目を削除。
- `plan/docs/`: 今回の起点文書はないため移動対象なし。

## ルール更新提案

なし。局所的な表示文言変更であり、新しい汎用判断基準は発生していない。

## 残課題

なし。
