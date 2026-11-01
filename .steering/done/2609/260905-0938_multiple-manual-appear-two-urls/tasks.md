# tasks — multiple-manual-appear-two-urls

## Phase 1: 実装

- [x] `manual_appear_two_urls` のシナリオ定義を追加する
- [x] 15秒待機と2 URL 分の設定を追加する
- [x] 再現コードの説明と期待結果を追加する

## Phase 2: テスト・文書化

- [x] popup 定義、コード欄表示条件、background の案内判定を単体テストする
  - 対象テストは成功。全体 Jest は 103 成功 / 2 既知失敗（`updateModeUI` の呼び出し順期待値）だった。
- [x] `tests/docs/README.md` に4番の実行手順と合格条件を追記する
- [x] Chrome 手動確認: 2つの監視タブで再現コードを実行し、各タブの検知・保存・停止を確認する
