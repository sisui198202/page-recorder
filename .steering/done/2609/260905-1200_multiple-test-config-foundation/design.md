# design — multiple-test-config-foundation

- 本番の複数監視設定は `multiple_configs` / `multiple_common_settings` として保持する。
- テスト適用状態は `multiple_test_scenario_state` に分離し、開始時はその状態だけを参照する。
- 設定取得レスポンスは、新旧の対象配列と共有設定を欠損なく返す。
- 互換性修復は実際に更新対象として特定できた要素だけに適用する。
- `single` の検知成功処理では、監視ロジック冒頭で取得した `currentState` を保存種別の解決に使う。完了状態への更新は `completedState` として局所化し、同一ブロックでの再宣言による TDZ を防ぐ。
