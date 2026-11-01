---
description: PageRecorder のログ表記ルール
globs:
  - src/background/**/*
  - src/ui/**/*
  - src/content/**/*
alwaysApply: false
---

# ログ表記ルール

- `background` の新規ログは原則 `logger` または `bgLog*` を使い、生の `console.*` を増やさない
- `monitoringConfigManager.js` の既存 `console.*` は現状維持可とするが、新規追加や横展開はしない
- 成功は `✅`、失敗は `❌`、注意は `⚠️`、開始や切替は `🔄`、時刻やスケジュール系は `⏰` を優先し、意味をぶらさない
- 1ログ1責務を守り、開始・完了・失敗を同じ行に詰め込みすぎない
- `[siteId]` や `[schedule:n]` など主要な識別子は先頭寄りに固定し、比較しやすくする
- 通常の完了・結果・操作・設定ログは重複抑止しない。停止、検知、保存、通知、設定保存、手動操作は各イベントを必ず残す
- 周期進捗・調査詳細だけは、`bgLogProgress` / `bgLogDiagnostic` を明示的に使う。抑止キーはログレベル・分類・event・安定化したscope（`tabId`、`siteId`、`scheduleIndex`など）で、同一キーの5秒以内だけを抑止する
- 周期ログを追加する際は本文で暗黙に抑止せず、event と対象scopeを指定する。WARN / ERROR は常に抑止対象外とする
- `console.group` / `console.groupCollapsed` は通常運用では常用せず、長い一連処理や詳細調査時だけ使う
- 色付きログは `resolveBgLogHighlight()` で自動判定され、`bgLogError` や `❌` 開始は赤、主要イベント（`⚡` `🎉` `🔄` `✅` `📸` `📄`）は黄色で表示される
- 色付けパターンの追加は `resolveBgLogHighlight()` の `yellowPatterns` 配列を更新する

## 参照

- 背景説明と具体例は `docs/ログ表記ガイド.md` を参照する
