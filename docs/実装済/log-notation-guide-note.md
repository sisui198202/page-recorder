# ログ表記ガイド文書化メモ

## 位置づけ

- 進行中 task `.steering/260829-1211_multi-monitor-popup-redesign/` は popup UI 改善が主題であり、今回のログ運用ガイド追加とはテーマが異なる
- そのため、task への積み増しではなく `plan/` 側で着手理由だけを残す

## 今回 `/newtask` を作らない理由

- 変更範囲は `docs/` 直下の小規模な運用ガイド追加と README 追記に限定する
- 保存スキーマ、background I/O、通知境界、既存ログ出力コードは変更しない
- 実装ではなく現状整理と運用指針の明文化が目的である

## 文書化の対象

- `src/background/background.js` の `writeBgConsole`、`bgLog*`、`logger` の役割整理
- `src/background/monitoringConfigManager.js` に生 `console.*` が混在している現状
- 絵文字プレフィックスの推奨意味
- DevTools の `%c` による色付きログ可否
- `console.group` / `console.groupCollapsed` の有効性と常用しない方針
