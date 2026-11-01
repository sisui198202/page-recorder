# main_discord_post_url_monitor 責務整理・実装ステップ計画

## 目的

`PageRecorder` と `main_discord_post_url_monitor` の責務を分離し、
在庫検知と Discord 投稿処理を疎結合にする。

本計画書は実装を行わず、受信側拡張機能に寄せるべき責務と、
段階的な実装ステップを整理する。

---

## 背景

現状の `PageRecorder` は、在庫差分検知後に以下の payload を外部拡張へ送信している。

- `type`
- `source`
- `siteId`
- `urls`
- `targetUrl`
- `title`
- `count`
- `discordChannelId`

一方、`main_discord_post_url_monitor` 側は `PAGE_RECORDER_STOCK_DETECTED` を受信しているが、
現状の処理は主に AEON URL を開くことに寄っており、
`discordChannelId` を投稿先ルーティングに使っていない。

そのため、

- PageRecorder は通知先分離用の情報を送っている
- 受信側はその情報をまだ活用していない

という不整合がある。

---

## 責務分離の方針

### PageRecorder の責務

- 在庫監視設定の管理
- baseline 保存
- 差分検知
- 通知イベントの生成
- 受信側へ必要最小限の payload を送る

### main_discord_post_url_monitor の責務

- 外部メッセージ受信
- payload バリデーション
- `siteId` / `discordChannelId` に基づく通知先決定
- URL オープン制御
- Discord 投稿制御
- 重複抑止
- 失敗時のログ、リトライ判断、フォールバック

### 分離の原則

- PageRecorder は Discord 固有仕様を持ちすぎない
- Discord 投稿先や投稿方法の判断は受信側で完結させる
- `discordChannelId` は PageRecorder からの「ヒント」ではなく、
  受信側にとっての明示的な入力として扱う

---

## 期待する受信側の最終仕様

`main_discord_post_url_monitor` は `PAGE_RECORDER_STOCK_DETECTED` を受けたとき、
最低限以下を行う。

1. payload を検証する
2. `siteId` と `discordChannelId` をログに出す
3. `discordChannelId` から投稿対象チャンネルを決定する
4. 必要なら URL を開く
5. Discord 投稿を実行する
6. 成功/失敗を `sendResponse` で返す

成功時のレスポンス例:

```json
{
  "success": true,
  "siteId": "aeon",
  "discordChannelId": "1512256504668094514",
  "openedCount": 1,
  "posted": true
}
```

失敗時のレスポンス例:

```json
{
  "success": false,
  "siteId": "aeon",
  "discordChannelId": "1512256504668094514",
  "error": "channel_not_found"
}
```

---

## 実装ステップ

### Phase 1: 受信 payload の可視化

目的:

- 受信側が `discordChannelId` を確実に受け取れている状態を作る

対応内容:

- `onMessageExternal` 受信時に payload の要点をログ出力
- `handlePageRecorderStockDetected()` 冒頭で以下を記録
  - `siteId`
  - `discordChannelId`
  - `urls.length`
  - `targetUrl`
- `discordChannelId` 未指定時の警告ログ追加

完了条件:

- Service Worker ログで `discordChannelId` を毎回確認できる
- AEON / toysrus で値の混線がないと判断できる

---

### Phase 2: payload バリデーションの明確化

目的:

- 受信側の入力条件を明文化し、異常系を早期に返す

対応内容:

- `type` 不一致の明示エラー
- `siteId` 未指定のエラー
- `discordChannelId` 未指定のエラーまたは警告
- `urls` 空配列のエラー
- サイト別 URL 妥当性判定
  - AEON
  - toysrus
  - 将来追加サイト

完了条件:

- 「受信はしたが、どこが不足しているか分からない」状態がなくなる
- `sendResponse` の失敗理由が機械的に追える

---

### Phase 3: 通知ルーティング層の追加

目的:

- `discordChannelId` を投稿先制御に使える受信側構造にする

対応内容:

- `handlePageRecorderStockDetected()` 直下に処理を詰め込まず、
  役割別の関数に分割
- 例:
  - `validatePageRecorderMessage(message)`
  - `resolveNotificationRoute(message)`
  - `openIncomingUrls(route, message)`
  - `postIncomingStockNotification(route, message)`
- `resolveNotificationRoute()` で
  - `siteId`
  - `discordChannelId`
  - 必要なら受信側設定
  を突き合わせて、投稿ルートを決定

完了条件:

- URL オープン処理と Discord 投稿処理が分離される
- `discordChannelId` の扱いが一箇所に集約される

---

### Phase 4: Discord 投稿先切替の実装

目的:

- `discordChannelId` に応じて投稿先を切り替える

対応内容:

- 受信側の Discord 投稿処理が現在参照しているチャンネル決定箇所を特定
- 投稿前に `discordChannelId` を優先適用
- `discordChannelId` に対応するチャンネル定義がなければ失敗扱い
- 投稿成功/失敗ログに `discordChannelId` を含める

完了条件:

- AEON 通知が AEON チャンネルへ投稿される
- toysrus 通知が toysrus チャンネルへ投稿される
- 他サイトのチャンネルIDが混入しない

---

### Phase 5: URLトリガーモードとの共存整理

目的:

- 既存の URL オープン機能を残しつつ、Discord 投稿責務と衝突させない

対応内容:

- URLトリガーモードを「補助機能」として位置づける
- 外部通知時の動作モードを整理
  - URL を開くのみ
  - 投稿のみ
  - URL を開いてから投稿
- 設定名とログ文言を見直し、動作意図を明確化

完了条件:

- `success: true, openedCount: 1` が「投稿成功」を意味しないことが明確になる
- 受信側レスポンスに `opened` と `posted` を分けて返せる

---

### Phase 6: E2E 手動テスト整備

目的:

- PageRecorder の Phase 4 テストを、受信側仕様に合わせて再定義する

対応内容:

- 直接 `sendMessage` テスト手順を整備
- AEON / toysrus それぞれの成功例を記載
- 受信ログ確認ポイントを定義
  - `siteId`
  - `discordChannelId`
  - `opened`
  - `posted`
- 投稿失敗時の切り分け手順を記載

完了条件:

- 「payload は正しいが投稿されない」ケースを迷わず切り分けられる

---

## 推奨データ契約

受信側で扱う外部通知 message の最小契約は以下とする。

```json
{
  "type": "PAGE_RECORDER_STOCK_DETECTED",
  "source": "PageRecorder",
  "siteId": "aeon",
  "discordChannelId": "1512256504668094514",
  "urls": [
    "https://aeonretail.com/product/..."
  ],
  "targetUrl": "https://aeonretail.com/Form/Product/ProductList.aspx?...",
  "title": "manual test aeon",
  "count": 1
}
```

補足:

- `siteId` は送信元サイトの意味
- `discordChannelId` は投稿先チャンネルの意味
- 受信側は `siteId` だけでチャンネルを再推論しない
- 受信側は `discordChannelId` を優先して扱う

---

## 設計上の注意

### 1. `siteId` と `discordChannelId` を混同しない

- `siteId` は業務上の分類
- `discordChannelId` は投稿先識別子

この2つは別用途なので、片方から片方を暗黙推論しすぎない。

### 2. 成功レスポンスを曖昧にしない

現状の `success: true, openedCount: 1` は、
URL を開けた成功なのか、Discord 投稿成功なのかが曖昧である。

将来的には最低限以下を分ける。

- `opened`
- `posted`
- `openedCount`
- `postTargetChannelId`

### 3. 受信側のサイト判定は拡張しやすくする

AEON 専用分岐のままだと toysrus 追加時に増改築しづらい。
サイト別ハンドラやルーティングテーブル化を前提に構造化する。

---

## リスク

- 受信側の既存 URLトリガー実装と新しい投稿ルーティングが競合する可能性
- `discordChannelId` と受信側のチャンネル定義の不整合
- 投稿処理失敗が URL オープン成功に隠れて見えにくくなる可能性
- Phase 4 のテスト期待値が、受信側未対応のままだと誤解を生む可能性

---

## 今回の判断

- PageRecorder は在庫検知専任に寄せる
- Discord 投稿責務は `main_discord_post_url_monitor` 側へ寄せる
- `discordChannelId` を使った投稿先切替は、受信側実装タスクとして扱う
- URLトリガーモードは残すが、投稿責務とは分離して整理する

---

## 次アクション案

1. `main_discord_post_url_monitor` 側に Phase 1 の受信ログ強化を入れる
2. `discordChannelId` を使う投稿ルーティング設計を受信側で確定する
3. その後に PageRecorder の Phase 4 手動テスト手順を更新する
