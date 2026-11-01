# scheduled-watch-sites.json 設定ガイド

## stock-fetch-diagnosis-sites.json

ECサイト単位の在庫あり・なし一括Fetch診断で使う、手動確認済みURLの同梱設定です。`scripts/sync-stock-fetch-diagnosis-samples.js`で生成し、共有のECサイトマスタは更新しません。

新規サイトの追加方法は[在庫Fetch診断のサイト追加手順](../../docs/在庫Fetch診断_サイト追加手順.md)を参照してください。

- `sites[].id`: `ec-sites.json`のsite ID
- `samples[].state`: `in_stock` または `out_of_stock`
- `samples[].url`: 診断対象URL
- `samples[].title`: 任意の表示名

## 概要

`scheduled-watch-sites.json` は、定時差分検知（複数サイト監視）の設定ファイルです。
複数のECサイトを並列で監視し、新商品が追加されたときに通知を行います。

## バックアップ運用

* 実機テストで時刻を書き換える前に `node scripts/set-test-times.js --backup` を実行し、元設定を退避する。
* テスト用の時刻変更後は、退避した JSON を基準に手動で戻す運用を正とする。
* `scheduled-watch-sites.json` のスキーマ自体は本タスクで変更しない。

---

## ルート構造

| キー | 型 | 説明 |
|------|-----|------|
| `version` | string | 設定ファイルのバージョン（例: `"1.0.0"`） |
| `sites` | array | 監視サイト設定の配列 |

---

## サイト設定（sites配列の各要素）

### 基本情報

| キー | 型 | 必須 | 説明 |
|------|-----|------|------|
| `id` | string | Yes | サイトの一意識別子（例: `"aeon-pokemon"`）。アラーム名やセッション管理に使用 |
| `name` | string | Yes | サイトの表示名（例: `"AEON ポケモンカード"`）。ログ出力に使用 |
| `enabled` | boolean | Yes | `true`: 監視有効 / `false`: 監視無効 |
| `url` | string | Yes | 監視対象のURL |

### selectors（セレクタ設定）

商品リンクを抽出するためのCSSセレクタを指定します。

| キー | 型 | 説明 |
|------|-----|------|
| `productLinks` | string | 商品リンク抽出元のCSSセレクタ。アンカー自体または商品カード要素を指定 |
| `itemCount` | string \| null | 商品数を取得するセレクタ（未使用の場合は `null`） |
| `screenshotTarget` | string \| null | スクリーンショット撮影前にスクロールする対象セレクタ |
| `scrollOffset` | number | スクロール後の追加オフセット（px）。固定ヘッダー対策用。省略時は0 |

**screenshotTargetとscrollOffsetの例:**
```json
"selectors": {
    "productLinks": ".product-tile-wrapper",
    "itemCount": ".result-count",
    "screenshotTarget": ".grid-header",
    "scrollOffset": 200
}
```
> **補足:** `screenshotTarget` にスクロール後、`scrollOffset` 分だけ追加でスクロールします。固定ヘッダーで要素が隠れる場合に使用します。

**productLinksの例:**
```
"a[href*='/product/0/P-']"  // href に /product/0/P- を含むリンク
"a.product-link"            // class="product-link" のリンク
".item-list a[href]"        // .item-list 配下のリンク
".product-tile-wrapper"     // 商品カード。配下の代表リンク1件を使う
```

### `productLinks` の指定ルール

- アンカー型: `a[href]` のようにリンク要素そのものを指定すると、その `href` をそのまま採用します
- カード型: `li.product__item` や `.product-tile-wrapper` のように商品カードを指定すると、配下の代表商品リンクを 1 件だけ採用します
- 重複URLは自動で除外されます

現行の `scheduled-watch-sites.json` では次の2パターンを使用しています。

| siteId | `productLinks` | パターン |
|------|------|------|
| `aeon-pokemon` | `li.product__item` | 商品カード型 |
| `toysrus-pokemon` | `.product-tile-wrapper` | 商品カード型 |

### `itemCount` 未設定時のフォールバック

- `itemCount` がある場合は、その要素の数字を優先して `count` に使います
- `itemCount` が無い場合は、`productLinks` で取得できた要素数と抽出URL数の大きい方を `count` に使います
- AEON 一覧ページだけは既存どおり本文の `対象アイテム: N件` パターンも補助的に参照します

### AEON のページング補足

- AEON の baseline 取得は `product__pager` がある場合、全ページを辿って URL 集合を保存します
- AEON の通常監視 tick は 1 ページ目に表示されている URL を基準に `newUrls` を判定します
- そのため AEON では `count` が全件数、`urls.length` が baseline 時は全件数、通常 tick 時は 1 ページ目件数になることがあります

### schedule / schedules（スケジュール設定）

監視ウィンドウの時間帯を指定します。
**単一スケジュール**には `schedule`、**複数スケジュール**には `schedules` 配列を使用します。

| キー | 型 | 説明 |
|------|-----|------|
| `startTime` | string | 監視開始時刻（HH:MM形式、例: `"11:57"`） |
| `endTime` | string | 監視終了時刻（HH:MM形式、例: `"15:15"`） |
| `intervalSeconds` | number | リロード間隔（秒）。5〜300の範囲 |

**動作:**
- `startTime` になると監視ウィンドウが開始
- `intervalSeconds` 間隔でページをリロードし差分検知
- `endTime` を過ぎると監視ウィンドウが終了

**単一スケジュール（schedule）:**
```json
"schedule": {
  "startTime": "11:57",
  "endTime": "12:15",
  "intervalSeconds": 60
}
```

**複数スケジュール（schedules配列）:**
```json
"schedules": [
  { "startTime": "11:57", "endTime": "12:15", "intervalSeconds": 60 },
  { "startTime": "12:57", "endTime": "13:15", "intervalSeconds": 60 },
  { "startTime": "13:57", "endTime": "14:15", "intervalSeconds": 60 }
]
```

> **注意:** `schedules` 配列が存在する場合、`schedule` は無視されます。

### notification（通知設定）

検知時の通知方法を指定します。

| キー | 型 | 説明 |
|------|-----|------|
| `openProductUrl` | boolean | `true`: 検知したURLを新規タブで開く |
| `notifyOtherExtensions` | boolean | `true`: `externalExtensionId` の送信先拡張機能へ通知を送信。ID 未設定時は `false` にする |
| `siteId` | string | 通知メッセージに含めるサイト識別子（例: `"aeon"`） |
| `discordChannelId` | string \| null | Discord通知先チャンネルID（分離が必要な場合） |
| `externalExtensionId` | string \| null | 通知先の外部拡張機能ID |

### cloudflareProtection（Cloudflare対策設定）

Cloudflareの「Just a moment...」チャレンジページを検知・突破するための設定です。
トイザラスなどCloudflare保護が有効なサイトで使用します。

| キー | 型 | デフォルト | 説明 |
|------|-----|-----------|------|
| `enabled` | boolean | `false` | Cloudflare検知を有効化 |
| `challengeWaitTime` | number | `30000` | チャレンジ突破の最大待機時間（ms） |
| `autoForeground` | boolean | `true` | チャレンジ検知時にタブを自動でフォアグラウンド化 |

**フォアグラウンド/バックグラウンドとは:**
- **フォアグラウンド**: 現在アクティブで表示されているタブ
- **バックグラウンド**: 裏で開いているが表示されていないタブ

Cloudflareチャレンジは **タブがフォアグラウンドでないと解決されない** ことがあります。
`autoForeground: true` を設定すると、チャレンジ検知時に自動でタブを前面に持ってきて解決を促します。

**設定例:**
```json
"cloudflareProtection": {
    "enabled": true,
    "challengeWaitTime": 30000,
    "autoForeground": true
}
```

**動作:**
1. ページ読み込み時に「Just a moment...」等のチャレンジページを検知
2. 検知した場合、タブをフォアグラウンドに移動（`autoForeground: true` の場合）
3. ブラウザが自動的にチャレンジを解決するのを最大 `challengeWaitTime` ms 待機
4. 解決後、通常の監視処理を再開

> **注意:** Cloudflare保護が有効なサイトでは `domWaitTimeout` も長めに設定することを推奨します（例: `35000`）

### domWaitTimeout（DOM待機タイムアウト）

商品一覧のDOM要素が表示されるまでの最大待機時間（ms）を指定します。

| キー | 型 | デフォルト | 説明 |
|------|-----|-----------|------|
| `domWaitTimeout` | number | `8000`（通常）/ `30000`（Cloudflare有効時） | DOM待機の最大時間 |

**設定例:**
```json
"domWaitTimeout": 35000
```

---

## 設定例

### 新規サイトを追加する

```json
{
  "id": "yodobashi-switch",
  "name": "ヨドバシ Nintendo Switch",
  "enabled": true,
  "url": "https://www.yodobashi.com/category/...",
  "selectors": {
    "productLinks": "a.product-item",
    "itemCount": null
  },
  "schedule": {
    "startTime": "10:00",
    "endTime": "12:00",
    "intervalSeconds": 30
  },
  "notification": {
    "openProductUrl": true,
    "notifyOtherExtensions": false,
    "siteId": "yodobashi",
    "discordChannelId": null,
    "externalExtensionId": null
  }
}
```

### 複数時間帯を監視する

`schedules` 配列を使用して、1日に複数の時間帯を監視できます:

```json
{
  "id": "aeon-pokemon",
  "name": "AEON ポケモンカード",
  "enabled": true,
  "url": "https://aeonretail.com/Form/Product/ProductList.aspx?gspsk=pkcg-all",
  "selectors": {
    "productLinks": "a[href*='/product/0/P-']",
    "itemCount": null
  },
  "schedules": [
    { "startTime": "11:57", "endTime": "12:15", "intervalSeconds": 60 },
    { "startTime": "12:57", "endTime": "13:15", "intervalSeconds": 60 },
    { "startTime": "13:57", "endTime": "14:15", "intervalSeconds": 60 }
  ],
  "notification": {
    "openProductUrl": true,
    "notifyOtherExtensions": false,
    "siteId": "aeon",
    "discordChannelId": null,
    "externalExtensionId": null
  }
}
```

### 一時的に監視を停止する

`enabled` を `false` に設定:

```json
{
  "id": "aeon-pokemon",
  "enabled": false,
  ...
}
```

---

## 注意事項

### 設定変更の反映

設定を変更した後は、**Chrome拡張機能をリロード**する必要があります:

1. `chrome://extensions` を開く
2. PageRecorder の「更新」ボタンをクリック
3. または拡張機能を無効→有効にする

### idの命名規則

- 小文字英数字とハイフンを使用
- 一意である必要がある
- 例: `aeon-pokemon`, `yodobashi-switch`, `rakuten-books`

### セレクタの確認方法

1. 対象サイトを開く
2. DevTools（F12）を開く
3. Consoleで確認:
   ```javascript
   document.querySelectorAll('セレクタ').length
   ```

### 監視ウィンドウの制限

- 各サイトは独立したタブで監視されます
- 同時に監視できるサイト数に制限はありませんが、多すぎるとメモリ消費が増加します
- `enabled: false` のサイトはアラームもタブも作成されません
