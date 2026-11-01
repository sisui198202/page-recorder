# design — Excel設定の正本化

## 方針

`MonitoringConfigManager` に、旧 `multiple_targets` を正本 `multiple_configs` へ移す内部移行メソッドを追加する。移行は `multiple_configs` が空の場合だけ旧配列を採用し、保存時に旧配列を削除する。両方がある場合は正本を維持して旧配列だけ削除する。

## 処理

1. 初期化、Excel出力、Excel取込の前に内部移行メソッドを呼ぶ。
2. `multiple_configs` が空で `multiple_targets` が配列かつ1件以上なら、配列を正本へ移す。
3. `multiple_targets` プロパティを削除し、変更があれば `monitoring_config` に保存する。
4. Excel入出力は返却された正本設定だけを参照・更新する。

## 変更対象

- `src/background/monitoringConfigManager.js`: 内部移行とExcel入出力の正本化。
- `tests/unit/monitoring-config-manager-change-mode.test.js`: 旧形式移行、出力、取込の回帰テスト。
- `tests/docs/excel-config-canonicalization-manual-test.md`: Chrome手動確認手順。

## 互換性

- public message action、CSV列、ダウンロード形式は変更しない。
- 旧データは削除前に同一内容を正本へ保存するため、監視対象を失わない。
