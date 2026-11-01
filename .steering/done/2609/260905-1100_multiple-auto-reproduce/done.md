# done — 260905-1100_multiple-auto-reproduce

## 完了日時

2026-09-05

## 対象タスク

`multiple` の4番「在庫なし2件を手動変更して検知する」シナリオに対し、自動再現トグルを追加し、ONで開始した場合のみ再現用DOM変更を自動実行できるようにした。

## 作業ブランチ

feature/multiple-monitoring-integration（統合ブランチ）

## merge先

main

## commit hash

d720413

## 変更概要

- 4番限定の自動再現トグルを popup に追加
- 開始メッセージへ非永続の `autoReproduce` を渡す仕組みを実装
- 許可シナリオだけで固定DOM変更関数を background で実行
- 成功・件数・失敗ログと、失敗tabだけの停止を実装
- popup/background の単体テストを追加
- PRD、TODO、手動テスト手順を更新
- 自動ON時は手動貼り付け案内を自動挿入案内へ切り替え

## 確認結果

- 対象の自動再現テスト 6件成功
- 全体 Jest 109件成功、2件失敗（既存の `updateModeUI` 呼び出し順の期待値不一致、本タスクとは無関係）
- Chrome手動確認: 自動ONで2tabのDOM変更、検知、HTML/スクリーンショット保存、停止を確認
- Chrome手動確認: 自動OFFで従来のDevTools手動再現を確認

## README/docs更新有無

- PRD、TODO、手動テスト手順を更新済み

## 残課題

なし
