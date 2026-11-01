---
description: background / Service Worker 開発規約
globs: src/background/**/*
alwaysApply: false
---

# background 固有ガードレール

- 監視設定の read / write / migrate は `MonitoringConfigManager` に集約する
- `background.js` の `configManager` は互換 Facade として残し、内部実装は `MonitoringConfigManager` に委譲する
- 監視設定について `chrome.storage.local` への直アクセスを増やさない
- 永続化キーは `monitoring_config` を正とし、旧 `monitoringConfig` は移行処理でのみ扱う

# 特に注意する変更

- popup とのメッセージ契約（`loadConfig`, `getStatus`, Import / Export, target 更新系）を壊さない
- Service Worker 初期化時の設定移行・再初期化フローを崩さない

# 変更後の確認

- Service Worker Console で設定 I/O（load / save / migrate）が成立すること
- popup 経由の主要メッセージが従来どおり応答すること
