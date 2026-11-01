# design — popup 設定 storage 1本化

## 方針

| 層 | 変更 |
|----|------|
| `monitoringConfigManager.js` | `migrateLegacyPopupStorage()` 追加、`initialize()` から呼ぶ |
| `popup.js` | `saveSettings` 修正、ドラフト関数削除、イベントを `scheduleSingleSettingsSave` のみに |

## 保存フロー（After）

```
UI変更 → scheduleSingleSettingsSave(250ms) → saveSettings()
  → unwrap loadConfig → single_config 構築 → saveConfig → monitoring_config のみ
```

## 読み込みフロー（After）

```
loadSettings → loadSingleModeSettings(single_config)
  （monitoringSettingsDraft 参照なし）
```

## 移行

- `monitoringSettingsDraft` + フラットキー群を読み、`mode === 'single'` 時に `single_config` へマージ
- マージ後 `monitoringSettingsDraft` とフラットキーを `remove`

## 修正バグ

`saveSettings` が `loadConfig()` の `{ success, config }` を unwrap せず `config.mode` 参照していたため、単一モード設定が `monitoring_config` に保存されない問題を修正する。
