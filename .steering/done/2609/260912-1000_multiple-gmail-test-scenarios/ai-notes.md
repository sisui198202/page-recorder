# ai-notes

## 現在の実行状況

- タスク名: multiple の Gmail 検知送信シナリオ
- 更新日: 2026-09-20
- 最後に更新したAI: Codex
- 状態: 全Phase・Chrome手動確認完了。main反映・steeringアーカイブ待ち
- 現在フェーズ: Phase 5 完了（Phase 6 を含む全Phase完了）
- 今回の主目的: multiple テストから Gmail API 送信を実行 ID 単位で検証できるようにする。
- 次にやること: main反映確認後に `done.md` を作成し、steeringを `.steering/done/2609/` へアーカイブする。

## 追加した知見

- 既存 single 8 番には Gmail の preflight と実行 ID の送信結果確認があり、multiple 側はこの責務を独立して実装する必要がある。
- テストメール成功確認と直近送信結果を同じ保存値で扱うと、single 8 の検知送信成功が multiple 6/7 の preflight を誤って失敗させる。確認状態は有効状態・送信先ごとに分離する。
- popup 再表示時は `multiple_test_scenario_state.scenario_id` が唯一の選択復元元であり、Gmail結果は session storage の `scenarioId` が現在選択中の6/7と一致する場合だけ表示する。

## 不採用と理由

## 手動テスト連携メモ

- 2026-09-20: single シナリオ8は合格。通常監視・DOM再現・検知・保存・Gmail API送信成功を確認済み（受信箱の到着・本文も確認済みとのユーザー報告）。
- 2026-09-20: multiple シナリオ6は「テストメール成功未確認」で要確認。single 8 の検知送信が直近送信結果を上書きする再現条件と原因を確認した。Gmail API送信は未実行。
- 2026-09-20: 修正後の関連107件と全ユニット249件が成功。旧バージョンで保存された確認状態には専用状態がないため、Chrome手動確認前にテストメールを再送する必要がある。
- 2026-09-20: popup再表示復元のユニットテストを追加し、全ユニット252件、`check:plan-todo`、`git diff --check` が成功。Chrome手動確認では、popupを閉じて開き直した後のシナリオ6/7・実行ID・実行中ポーリング復元を確認する。
- 2026-09-20 10:39:55: multiple シナリオ6で Gmail API 成功1件（実行ID: `gmail-multiple-1789688399469-u9ok87`）。popupでシナリオ6・実行IDの再表示、受信箱到着・本文確認済みを確認した。
- 2026-09-20 10:46:27: multiple シナリオ7で Gmail API 成功2件（実行ID: `gmail-multiple-1789688759572-pf0shh`）。popupでシナリオ7・実行IDの再表示、受信箱到着・本文確認済みを確認した。

## close 前引き継ぎ

- Chrome手動確認では、multipleシナリオ6で1通、シナリオ7で2通のGmail検知送信、受信箱到着・本文、popup再表示後の同一シナリオ・実行ID・結果カードの復元を確認済み。通常監視と既存シナリオの通知境界は変更しない。
