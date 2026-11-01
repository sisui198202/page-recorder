# refactor-baseline.md

作成日: 2026-06-12 10:09:21
実装完了日:2026/06/12 14:09:21

## git status

未コミット変更あり。今回作業とは別件の `.steering` 配下削除・再配置が含まれているため、ランタイム変更とは分離して扱う。

```text
 D .steering/260526-1228_aeon-scheduled-stock-diff-notification/blockers.md
 D .steering/260526-1228_aeon-scheduled-stock-diff-notification/decisions.md
 D .steering/260526-1228_aeon-scheduled-stock-diff-notification/design.md
 D .steering/260526-1228_aeon-scheduled-stock-diff-notification/requirements.md
 D .steering/260526-1228_aeon-scheduled-stock-diff-notification/tasklist.md
 D .steering/260528-1724_background-config-manager-unify/blockers.md
 D .steering/260528-1724_background-config-manager-unify/decisions.md
 D .steering/260528-1724_background-config-manager-unify/design.md
 D .steering/260528-1724_background-config-manager-unify/requirements.md
 D .steering/260528-1724_background-config-manager-unify/tasklist.md
 D .steering/260529-aeon-list-product-url-diff/design.md
 D .steering/260529-aeon-list-product-url-diff/requirements.md
 D .steering/260529-aeon-list-product-url-diff/tasklist.md
 D .steering/260529-aeon-stock-watch-window/design.md
 D .steering/260529-aeon-stock-watch-window/requirements.md
 D .steering/260529-aeon-stock-watch-window/tasklist.md
 D .steering/260529-popup-storage-unify/design.md
 D .steering/260529-popup-storage-unify/requirements.md
 D .steering/260529-popup-storage-unify/tasklist.md
 ?? .steering/20260612-refactor-instructions/
 ?? .steering/2605/
```

## git log --oneline -5

```text
88890b6 docs: add done.md for multi-schedule-diff-detection task
f7c4326 feat: 定時差分検知の複数サイト対応（マルチスケジュール）
d041be8 chore: AEON監視ウィンドウ機能とgit整理
5ffddd9 docs: add done.md for baseline-screenshot-log task
90c9811 feat: baseline取得時にスクショ+ログ+永続化を実装
```

## Node / npm

```text
node: v22.13.0
npm: 11.0.0
```

## 現状の npm test

Phase 1 着手前は `tests/setup.js` 不在で Jest 設定エラー。

```text
> summary-autoreload-downloader@1.4.0 test
> jest

● Validation Error:

  Module <rootDir>/tests/setup.js in the setupFilesAfterEnv option was not found.
         <rootDir> is: ~/Work/chromeExtensions/PageRecorder
```

## 主要ファイル行数

```text
5702 src/background/background.js
1894 src/background/monitoringConfigManager.js
68 src/background/pattern3-fix.js
5181 src/ui/popup.js
279 src/content/content.js
13124 total
```

## 補足

* `content.js` は削除候補ではなく、`background.js` の `checkKeywordChange()` から `getCurrentDOMState` で参照されている。
* `web_accessible_resources` の `src/lib/*` は Web ページ公開用途の参照を確認できず、整理候補とする。
