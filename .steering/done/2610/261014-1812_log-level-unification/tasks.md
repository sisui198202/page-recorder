# Tasks: Service Worker ログレベル統一

## Phase 1: 調査と設計

- [x] ログ基盤・既存ガイド・直接 `console.*` の配置を確認する。
- [x] レベル分類と対象外を要件・設計に記録する。

## Phase 2: 実装

- [x] `background.js` の対象ログを `bgLog*` 経由へ移す。
- [x] `monitoringConfigManager.js` の対象ログを `mcmLogger` 経由へ移す。
- [x] ログガイドを実装内容へ同期する。
- [x] アラーム再設定の詳細ログを DEBUG に分類し直す。
- [x] 失効した日産テスト対象を置換し、シナリオ1の自動再現を復旧する。
- [x] popup 再表示時に保存済みログレベルを復元する。
- [x] 起動時に復元した実効ログレベルを1回だけ表示する。

## Phase 3: 検証

- [x] unit test、構文・差分チェック、`plan/todo.md` チェックを実行する。
- [x] Chrome 手動確認で INFO / DEBUG の表示、popup 再表示後の復元、起動時の実効モード表示を確認し、結果を記録する。
