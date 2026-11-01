# done.md — 在庫取得方式診断

## 完了情報

| 項目 | 内容 |
| --- | --- |
| 完了日時 | 2026-09-24 17:12 JST |
| 作業ブランチ | `feature/stock-fetch-diagnosis` |
| マージ先 | `main` |
| コミットハッシュ | `ca7244a27d0c04b31146ab2940e5f8669b63129a` |
| 削除したブランチ | `feature/stock-fetch-diagnosis`（local） |

## 変更概要

- popupでFetch HTMLと表示後DOMを比較する単件診断と、在庫あり・なしサンプルを順次確認するECサイト一括診断を追加した。
- HTML、比較JSON、README、集計・解説を同一run ID配下へ保存し、必要時はDevTools API調査メモも保存できるようにした。
- run IDのフォルダー名日時は常にJST、`diagnosedAt`はUTC ISO 8601として保存する。

## 確認結果

- `npm test -- --runInBand --silent`: 13 suites、309 tests 成功。
- `npm run check:plan-todo`、`node --check src/background/background.js`、`git diff --check` 成功。
- Chromeで単件・一括診断を実行し、成果物保存、popup復元、既存監視・通知に副作用がないことを確認した。
- ユーザーがDownloadsの`stock-fetch-20260924163443-...`と`stock-fetch-20260924163517-...`を確認し、どちらもJSTの16時台であることを報告した。

## README / 計画整理

- READMEに診断機能とJST run ID／UTC `diagnosedAt`の扱いを追記した。
- `plan/todo.md`から完了項目を削除し、計画書を`docs/実装済/`へ移動した。

## 残課題

- Fetch単独監視の本採用、Network Fetch/XHRの自動収集、HAR取込、`debugger`権限追加は対象外。必要時は別タスクで検討する。

## ルール更新提案

- 更新不要。JSTの利用者向けフォルダー名とUTCの機械処理日時の分離は、本タスクの設計・テストに記録済みであり、既存ルールで運用できる。
