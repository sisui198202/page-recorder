# 実装済み: 新商品URL自動取得

## 完了日

2026-08-25

## 概要

複数サイト定時監視で、新規に出現した商品URLだけを抽出し、既存の external messaging へ渡すフローを整備した。
`PageRecorder` の責務は「新規商品URLの抽出・保存・通知イベント生成」までに限定し、通知先決定や `AutoCartAgent` 連携判断は受信側拡張で扱う前提を明文化した。

## 実装内容

- `captureScheduledSnapshot()` まわりで `selectors.productLinks` からの商品URL抽出を整理
- `baselineUrls` と `newUrls` を基準にした差分検知フローを明確化
- 外部拡張通知の payload を `urls` / `siteId` / `discordChannelId` のまま維持
- `src/config/README.md` に `productLinks` の指定ルールと `itemCount` フォールバックを追記
- `tests/docs/` に手動テスト導線と `newUrls` / payload 確認手順を整理

## 関連資料

- `.steering/done/2608/260820-1547_new-product-url-auto-detection/`
- `tests/docs/scheduled-stock-diff-detection-verification.md`
- `src/config/README.md`
- `plan/todo.md`

## 残課題

- 通知先の最適化は受信側拡張 (`main_discord_post_url_monitor` / `AutoCartAgent`) 側の課題として扱う
- 複数サイト一括監視UI改善は別タスクで再判断する
