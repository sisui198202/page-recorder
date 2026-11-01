# decisions — multiple-test-config-foundation

## テスト状態を独立保存する

テスト用の対象・共通設定は `multiple_test_scenario_state` に分離する。本番の `multiple_configs` と `multiple_common_settings` をテスト開始の副作用から保護するため。
