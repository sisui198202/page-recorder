# tasks — multiple-auto-reproduce

## Phase 1: UI とメッセージ

- [x] 4番限定の自動再現トグルを追加する
- [x] 開始メッセージへ非永続の `autoReproduce` を渡す

## Phase 2: background 自動注入

- [x] 許可シナリオだけで固定DOM変更関数を実行する
- [x] 成功・件数・失敗ログと、失敗tabだけの停止を実装する

## Phase 3: テストと文書

- [x] popup/backgroundの単体テストを追加する
- [x] PRD、TODO、手動テスト手順を更新する
- [x] 対象Jestと全体Jestを実行する
  - 対象の自動再現テストは6件成功。
  - 全体Jestは109件成功、2件失敗。既存の `updateModeUI` 呼び出し順の期待値不一致であり、本タスクの変更箇所とは無関係。
- [x] 自動ON時は手動貼り付け案内を自動挿入案内へ切り替える
- [x] Chrome手動確認: 自動ONで2tabのDOM変更、検知、HTML/スクリーンショット保存、停止を確認する
- [x] Chrome手動確認: 自動OFFで従来のDevTools手動再現を確認する
