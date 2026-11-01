# tasks — 新商品URL自動取得

## Phase 1: steering

- [x] `requirements.md` / `design.md` / `tasks.md` / `decisions.md` / `blockers.md` を作成

## Phase 2: DOM・設定確認

- [x] `scheduled-watch-sites.json` の対象サイトごとに `selectors.productLinks` の妥当性を確認
- [x] アンカー直接指定と商品カード指定の両パターンを整理
- [x] `selectors.itemCount` が未設定でも件数フォールバックが崩れないか確認

## Phase 3: background 実装

- [x] `captureScheduledSnapshot()` の URL 抽出ロジックを今回方針に合わせて整理
- [x] ベースライン保存と `newUrls` 判定の責務を明確化
- [x] `handleMultiSiteDetection()` で新規URL中心のログと通知が維持されることを確認

## Phase 4: 手動確認

- [x] 初回実行で `baselineUrls` が保存され、通知しないことを確認
      `tes'` で設定バックアップ → 対象サイト isolate → 時間設定を実行し、拡張リロード後の初回 baseline 保存だけを確認する
- [x] 2回目以降で新規商品追加時に `newUrls` のみ検知されることを確認
      `tes'` の baseline 確認 / baseline から商品URLを1件減らす snippet を使って差分を強制発火し、`newUrls` のみで検知されることを確認する
- [x] 新規URLがないケースで誤通知しないことを確認
      baseline 保存直後は tick を再実行しても通知されないこと、`scheduledStockLogs` に余計な検知ログが増えないことを確認する
- [x] 外部拡張通知の payload に期待する `urls` / `siteId` / `discordChannelId` が含まれることを確認
      `tes'` の payload preview / direct notify は事前疎通確認に使い、本確認は受信側拡張の Console で実 payload を確認する

## Phase 5: ドキュメント

- [x] `src/config/README.md` に必要な設定前提を追記
- [x] 手動テスト文書を追加または更新
- [x] `plan/todo.md` の該当項目更新方針を確認

## 保留項目

### 不要タスク

- [/] popup からの抽出設定UI追加
  `src/config/scheduled-watch-sites.json` を正本として運用するため、本タスクでは実施しない
- [/] 抽出URLの自動監視登録
  `PageRecorder` の責務は新規商品URLの検知と通知イベント生成までとし、`discord_post_url_monitor` へ通知する構成を維持するため、本タスクでは実施しない

### 別リポジトリ・受信側で扱う課題

- [/] 受信側拡張の通知先最適化
  `PageRecorder` は `siteId` / `discordChannelId` を送るまでを責務とする
  通知先決定や `AutoCartAgent` 連携は受信側拡張で扱う
