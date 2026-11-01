# tasklist — popup 設定 storage 1本化

## Phase 1: MCM 移行

- [x] `migrateLegacyPopupStorage()` 実装
- [x] `initialize()` から呼び出し

## Phase 2: popup 保存

- [x] `unwrapConfigFromManager` / `buildSingleConfigFromUI` 追加
- [x] `saveSettings` を monitoring_config のみに
- [x] ドラフト即時保存・`saveTargetUrlDraftOnly` 削除
- [x] イベントリスナーを debounced save のみに

## Phase 3: popup 読み込み

- [x] `loadSingleModeSettings` からドラフトフォールバック削除
- [x] `saveMultipleModeCommonSettings` で unwrap 使用

## Phase 4: 確認

- [x] popup で URL・通知ID 保存 → SW で `monitoring_config` 確認
- [x] `monitoringSettingsDraft` が再生成されないこと
