# design — multiple-monitor-duration-wait

## 方針

`runMultipleMonitoringStartConfigs` の複数URL監視ループで使用する監視時間満了判定を小さな関数へ抽出する。既存の開始時判定に加え、リロード後待機ループの直後で同じ判定を行う。

待機終了後は監視状態を `duration_elapsed`、`stopped`、`continue` に分類する。満了していた場合は、既存の `active` / `completed` 状態更新、interval解除、テストログセッション解除、状態削除、警告ログを実行して return する。状態なし・inactive・completed の停止済みケースも無出力で return し、継続可能な有効状態だけが直後の `checkKeywordChange` と検知時ダウンロードへ進む。

## 追加方針

`MULTIPLE_TEST_SCENARIOS` に `duration_elapsed_during_reload_wait` を追加する。日産6710の既存固定2 URL・セレクタを使い、`initialKeywordDetection: false`、`interval: 5`、`duration: 10`、`reloadWaitAfterReload: 15` を共通設定と各対象設定に持たせる。保存先は `multiple_test_scenario_state` のみで、本番の `multiple_configs` と `multiple_common_settings` は変更しない。

このシナリオはDOM変更を必要としないため、手動再現コード・自動再現を提供しない。background は手動再現対象外として扱い、待機中のログを通常のリロード後待機として出す。満了判定により待機後のキーワード判定・検知・保存へ到達しないことをテストする。

## 変更対象

- `src/background/background.js`
- `src/ui/popup.js`
- `tests/unit/background-functions.test.js`
- `tests/unit/popup-multiple-monitoring-resolution.test.js`
- `tests/docs/README.md`

## 非変更範囲

- 単一URL監視、系統B/C、`startMonitoring` の抽出、alarms移行
- storage schema、外部通知payload
