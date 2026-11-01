# design — simplify-test-scenario-labels

## 方針

- `src/ui/popup.html` の7個の `option` テキストから「【自動判定対応】」だけを削除する。
- `src/ui/popup.js` の `SINGLE_TEST_SCENARIOS` にある7個の `label` を、初期HTMLと同じ名称にする。
- `supportsAutoJudgement: true` は全シナリオに残し、実行方式の表示・開始経路・ポーリングには触れない。

## 表示契約

single の選択肢は以下を表示する。

1. `1. 在庫なしページで継続監視`
2. `2. 売り切れ表示が消えることを確認する`
3. `3. 在庫ありページで開始直後に一致`
4. `4. 在庫なしページで開始直後は不一致`
5. `5. 空キーワード設定の反映と開始前バリデーション確認`
6. `6. 異常系: 一致要素なしで error 確認`
7. `7. 異常系: 無効セレクタで error 確認`

## テスト

- `initial-detected-auto-test-contract.test.js` の表示契約を更新する。
- `supportsAutoJudgement: true` が7件維持され、HTMLとJSのどちらにもバッジ文言がないことを確認する。
- 対象ユニットテストで既存の自動判定開始契約が維持されることを確認する。

## 承認状態

2026-09-12 ユーザー提示の実装計画を承認済み設計として扱う。
