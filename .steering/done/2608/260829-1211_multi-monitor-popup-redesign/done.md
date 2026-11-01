# done — 260829-1211_multi-monitor-popup-redesign

## 完了日時

2026-09-05

## 対象タスク

popup の通常操作を `複数URL監視` の主導線へ整理する。

## 作業ブランチ

`chore/close-multi-monitor-popup-redesign`

## merge 先

`main`

## 実装コミット

`e979811`（`feat: prioritize multiple monitoring in popup`）

## 変更概要

- popup の初期主導線を複数URL監視とし、監視中／停止中の件数サマリーを表示
- EC監視サイトの選択、追加時の設定自動補完、選択状態の保持を追加
- 共通監視設定・共通時間設定・設定管理の折りたたみ状態を保存・復元
- README と計画文書を完了状態へ整理

## 確認結果

- Chrome popup で、複数URL監視の初期表示、EC監視サイト選択・自動補完・選択保持、件数サマリー、各監視操作、折りたたみ状態の復元を確認済み
- `npm test` の成功を確認済み
- `tasks.md` に未完了の `[ ]`・`[~]` はない

## README/docs 更新有無

- `README.md` に複数URL監視を通常操作の主導線とする説明を追加
- `plan/todo.md` から完了済みの複数サイト一括監視UI改善を削除
- `plan/docs/missing-features-roadmap.md` を `docs/実装済/` へ移動

## ルール更新提案

なし。今回の判断は既存の task-close と steering 運用ルールで扱えており、新しい再利用可能な基準は生じていない。

## 残課題

- 監視時間満了後、待機解除時に余分な判定が1回実行される問題は、`plan/todo.md` の「待機完了後の監視時間超過時の判定・保存抑止」として別タスクに残す。

## 削除したブランチ

- `feature/multi-monitor-popup-redesign`（`main` 反映確認後に削除）
