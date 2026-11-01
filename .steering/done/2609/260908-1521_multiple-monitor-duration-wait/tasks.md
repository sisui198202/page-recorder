# tasks — multiple-monitor-duration-wait

## Phase 1: 事前確認

- [x] `plan/todo.md`、既存の待機処理、既存の満了停止処理を確認する。

## Phase 2: 実装

- [x] 監視時間満了判定を再利用可能な小関数へ抽出する。
- [x] リロード後待機の直後に満了時の終了処理を追加する。

## Phase 3: 検証

- [x] 満了・停止済み・未満了の単体テストを追加する。
- [x] Jest、TODO検査、差分検査を実行する。

## Phase 4: 待機中満了シナリオ追加

- [x] `multiple` テストタブへ、日産6710固定2 URL・5秒間隔・10秒監視時間・15秒リロード後待機の専用シナリオを追加する。
- [x] 専用シナリオが `multiple_test_scenario_state` のみを使用し、手動DOM変更・自動再現コードを表示しないことを確認する。
- [x] background で専用シナリオの手動再現コード案内を出さず、待機後の満了時に判定・保存へ進まないことを単体テストで確認する。
- [x] `tests/docs/README.md` に開始方法と、待機後は停止ログだけになる合格条件を追加する。

## Phase 5: 手動確認・完了処理

- [x] `duration < reloadWaitAfterReload` の複数URL監視を実行し、待機後に判定・保存されないことを確認する。
- [x] 手動確認結果を記録する。
- [x] `/task-close` を実行し、計画・steeringを完了アーカイブする。
