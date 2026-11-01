# requirements — popup 設定 storage 1本化

## 背景

単一モードの popup 設定が `monitoring_config` / `monitoringSettingsDraft` / レガシーフラットキーの3系統に分裂し、UI と background で値が食い違う。

## 目的

- 正（Single Source of Truth）を `monitoring_config` のみにする
- popup 保存・読み込みを `configManager.saveConfig` / `loadConfig` に統一する

## 機能要件

1. popup の `saveSettings` は `monitoring_config` のみ更新する（ドラフト・フラットキーへは書かない）
2. popup 読み込みは `single_config` のみ表示する（ドラフトフォールバック廃止）
3. 既存のドラフト・フラットキーは初回起動時に `monitoring_config` へマージ後削除する
4. `loadConfig` 応答の `{ success, config }` を正しく unwrap して保存する

## 非機能要件

- 複数モードの既存保存経路は壊さない
- background の定時差分・MCM 統合とは独立タスクのまま維持

## 受け入れ条件

- 指定URL・通知先拡張IDを popup で保存し、SW で `monitoring_config.single_config` に反映される
- popup 再表示で同じ値が表示される
- `monitoringSettingsDraft` とレガシーフラットキーが新規保存で増えない
