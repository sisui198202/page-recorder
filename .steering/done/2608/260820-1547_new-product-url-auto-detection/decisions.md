# decisions — 新商品URL自動取得

## 初期判断

1. 今回の起点は `plan/todo.md` と `plan/docs/missing-features-roadmap.md` とする
2. 実装スコープは `scheduled-watch-sites.json` ベースの複数サイト定時監視に限定する
3. popup UI や受信側拡張のルーティング改善は別タスクに分離する
4. `PageRecorder` の責務は「新規商品URLの抽出・保存・通知イベント生成」までとする
5. popup からの抽出設定UI追加は、`src/config/scheduled-watch-sites.json` を正本として運用するため、不要タスクとする
6. 抽出URLの自動監視登録は、`PageRecorder` の責務が検知と通知イベント生成までであり、`discord_post_url_monitor` へ検知を渡す構成を維持するため、不要タスクとする

## 未確定事項

- どのサイトで追加の URL 正規化が必要か
- サイトごとに `selectors.productLinks` だけで十分か
- 手動テスト文書を新規作成するか、既存文書に追記するか
