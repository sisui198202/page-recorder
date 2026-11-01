# AEON 定時差分検知 — Service Worker 手動テスト手順

PageRecorder の **監視ウィンドウ**（開始〜終了のあいだ、一覧をリロードして新規商品 URL を検知）を、**Service Worker（SW）コンソール**から確認する手順です。

タスク完了確認の正本は [tests/docs/scheduled-stock-diff-detection-verification.md](~/Work/chromeExtensions/PageRecorder/tests/docs/scheduled-stock-diff-detection-verification.md:1) を使い、この文書は AEON / SW 固有の補足手順とトラブルシュートに寄せる。

---

## この文書の使い方

| やりたいこと | 読む節 |
|--------------|--------|
| 最短で差分検知だけ試す | [クイック手順（差分検知）](#クイック手順差分検知) |
| 特定の商品 URL で discord まで試す | [特定商品 URL で試す](#特定商品-url-で試すdiscord-連携) |
| テスト後に baseline を元に戻す | [§3.6 baseline を元に戻す](#36-テスト後に-baseline基準を元に戻す) |
| baseline スクショ・ログの保存先 | [§1.5 baseline 証跡ファイル](#15-baseline-証跡ファイルの確認) |
| `count` と `urls` の意味 | [用語](#用語) |
| タブが2枚になる | [よくあるトラブル](#よくあるトラブル) |
| 本番運用 | [本番運用](#本番運用) |

---

## 用語

| 用語 | 意味 |
|------|------|
| **一覧タブ** | popup の「指定URL」（`ProductList.aspx`）。監視中は **1枚** が正しい |
| **商品タブ** | 検知後に開く `/product/0/P-...`。設定により **複数枚** になりうる |
| **`scheduledStockSnapshots`** | URL 全文をキーにした「基準」辞書。**古いキーは自動削除されない** |
| **`count`** | ページの「対象アイテム：N件」に近い数（例: 28） |
| **`urls`** | baseline では巡回した全ページの商品 URL 配列。通常 tick の差分検知も **ここを比較** |
| **`newUrls`** | 基準に無く、いまの一覧に有る URL（最大5件） |

AEON baseline では `count` と `urls.length` が一致する想定です。通常 tick の途中値や他サイトでは一致しない場合があります。

---

## 前提

1. `chrome://extensions` で PageRecorder を **更新（リロード）**
2. popup（`monitoring_config`）を保存:
   - **定時監視を有効化** ON
   - **監視開始・終了時刻**（手動テスト時は **終了 = 今から15分後** など未来にする）
   - **リロード間隔**（手動テスト例: `60` 秒）
   - **指定URL** = AEON 一覧（例: ポケモンカード検索）
3. 連携（discord_post_url_monitor 等）:
   - **URL監視（AEON）** ON
   - **自動カート（イオン）** ON

### 実行場所（重要）

| 場所 | `startScheduledStockWatch` | `document.querySelectorAll` |
|------|----------------------------|-----------------------------|
| 一覧ページのコンソール | 使えない | 使える |
| PageRecorder の **SW コンソール** | **`await self.startScheduledStockWatch()`** | **使えない**（`document is not defined`） |

**SW を開く:** `chrome://extensions` → PageRecorder の **Service Worker** → Console

---

## 1.5 baseline 証跡ファイルの確認

監視開始後、**初回 snapshot 成功時に1回だけ** Chrome ダウンロードフォルダへ保存される（popup の「スクリーンショット」OFF でも保存）。

```text
download/aeon/stock/{yyMMdd}/
  baseline_{yyMMdd-hhmmss}.png
  baseline_{yyMMdd-hhmmss}.html
  baseline_{yyMMdd-hhmmss}.txt
```

差分検知成功時は **同じ `{yyMMdd}` フォルダ** に `detected_{yyMMdd-hhmmss}.txt` が追加される。

| 要素 | 形式 | 例 |
|------|------|-----|
| 日付フォルダ | JST・2桁年 + 月日 | `260601` |
| ファイル名 | `{yyMMdd-hhmmss}` | `260601-115700` |

### 確認手順

1. [§2.5 監視の完全停止](#25-監視の完全停止) → アラームクリア
2. SW で `await self.startScheduledStockWatch()`
3. Chrome の **ダウンロードフォルダ** で `download/aeon/stock/{今日yyMMdd}/` を確認
4. `baseline_*.{png,html,txt}` が **1セット** あること
5. 2回目以降の tick では baseline ファイルが **増えない** こと
6. 差分検知テスト後、`detected_*.txt` が **同フォルダ** にあること

AEON 複数ページ一覧では、baseline 実行中に `1ページ目 → 2ページ目以降` を巡回しても、終了前に 1 ページ目へ戻らずそのままタブが閉じる。保存される `baseline_*.png` / `baseline_*.html` は 1 ページ目の内容を維持する。

SW コンソールでタイムスタンプ形式を確認する例:

```javascript
self.formatJstStockTimestamp(new Date());
// → { yyMMdd: '260601', yyMMdd_hhmmss: '260601-115700' }
```

> 旧パス `PageRecorder/stock_logs/` は使わない。repo の `./download/aeon/stock/` に手動コピーして整理してもよい。

### トラブル: `ダウンロード.png` / `image readback failed`

| 症状 | 原因 | 対処 |
|------|------|------|
| ファイル名が `ダウンロード.png` / `ダウンロード.html` | HTML が巨大で data URL 上限超過 → ファイル名が無視される | 拡張を **リロード** して再試行（Blob URL 方式に修正済み） |
| `baseline PNG 保存失敗: image readback failed` | 一覧タブが **非アクティブ**（`active: false` で開く）のままキャプチャ | 拡張リロード後、再試行。保存時にタブを一時 active + ウィンドウ focus する（修正済み） |
| `URL.createObjectURL is not a function` | Service Worker では Blob URL が使えない | 拡張を **リロード**（Offscreen Document 経由に修正済み） |
| `DOM準備待機タイムアウト` が出る | 商品詳細用セレクタで一覧タブを待っていた | 修正済み（AEON 一覧は専用待機に切替） |
| 再試行しても baseline が保存されない | 前回セッションで `baselineArtifactsSaved: true` 済み | [§2.5 監視の完全停止](#25-監視の完全停止) → 再 `startScheduledStockWatch()` |

再テスト前に必ず **§2.5 で監視を完全停止** してから開始すること。

---

## クイック手順（差分検知）

本番の定時を待たず、「1件増えた」とみなして検知する最短ルートです。

```
§2.5 停止 → §3.2 基準を1件減らす → アラームクリア → 開始 → §3.4 で newUrls 確認
```

### 0 基準確認

```javascript
chrome.storage.local.get('scheduledStockSnapshots').then(function(r) {
  var snapshots = r.scheduledStockSnapshots || {};
  Object.keys(snapshots).forEach(function(url) {
    var data = snapshots[url];
    console.log(url.slice(-50), 'count:', data.count, 'urls:', (data.urls || []).length, 'at:', data.checkedAt);
  });
});
```

## 1 監視の完全停止（テスト前に推奨）

`inspectionTabId` だけ閉じると、同じ一覧 URL のタブが残り **再開始で2枚** になりうる。

```javascript
(async function () {
  const TARGET =
    'https://aeonretail.com/Form/Product/ProductList.aspx?gspsk=%e3%83%9d%e3%82%b1%e3%83%a2%e3%83%b3%e3%82%ab%e3%83%bc%e3%83%89&psc=0';
  const key = TARGET.replace(/\/$/, '');

  var r = await chrome.storage.local.get('scheduledStockWatchSession');
  var s = r.scheduledStockWatchSession;
  if (s && s.inspectionTabId) {
    try { await chrome.tabs.remove(s.inspectionTabId); } catch (e) {}
  }

  var tabs = await chrome.tabs.query({});
  for (var i = 0; i < tabs.length; i++) {
    var tab = tabs[i];
    var u = tab.url || tab.pendingUrl || '';
    if (u.replace(/\/$/, '') === key) {
      try { await chrome.tabs.remove(tab.id); } catch (e) {}
    }
  }

  await chrome.storage.local.remove('scheduledStockWatchSession');
  await chrome.alarms.clear('stockWatchTick');
  await chrome.alarms.clear('dailyStockCheck');
  console.log('停止しました');
})();
```

### 2. 基準を1件減らす（§3.2）

末尾を `slice` で削る方法で可（最後の1件が検知対象になる）。

```javascript
(async function () {
  const MONITOR_KEY = 'https://aeonretail.com/Form/Product/ProductList.aspx?gspsk=%e3%83%9d%e3%82%b1%e3%83%a2%e3%83%b3%e3%82%ab%e3%83%bc%e3%83%89&psc=0';

  const store = await chrome.storage.local.get('scheduledStockSnapshots');
  const snapshots = store.scheduledStockSnapshots || {};
  const snap = snapshots[MONITOR_KEY];

  if (!snap || !snap.urls || !snap.urls.length) {
    console.error('urls が空です');
    return;
  }

  snapshots[MONITOR_KEY] = {
    count: Math.max(0, snap.count - 1),
    urls: snap.urls.slice(0, -1),
    checkedAt: snap.checkedAt
  };

  await chrome.storage.local.set({ scheduledStockSnapshots: snapshots });
  console.log('基準を1件少なくしました', {
    count: snapshots[MONITOR_KEY].count,
    urls: snapshots[MONITOR_KEY].urls.length
  });
})();
```

### 3. アラームをクリアしてから開始

```javascript
await chrome.alarms.clear('dailyStockCheck');
await chrome.alarms.clear('stockWatchTick');
await self.startScheduledStockWatch();
```

- 戻り値 `undefined` は **正常**
- `⏰ 監視ウィンドウを開始しました` はログレベル WARNING のため **出ないことがある**（§トラブル参照）

### 4. 結果確認（10秒〜1分後）

```javascript
chrome.storage.local.get('scheduledStockLogs').then(function(r) {
  var log = (r.scheduledStockLogs || []).slice(-1)[0];
  console.log('newUrls:', log && log.newUrls);
});
```

**成功:** `newUrls` に `/product/0/P-...` が **1件以上**

**検知後:** `scheduledStockWatchSession` は `undefined`（セッション終了）で正常

**テスト後:** baseline を減らしたままなら [§3.6](#36-テスト後に-baseline基準を元に戻す) で復元する

---

## 特定商品 URL でベースラインから1件減らすを試す（discord 連携）

「この商品ページでカートイン〜購入確認を試したい」とき用です。

試したいURL:https://aeonretail.com/product/0/P-2319294424002/P-231929442400201/

### 条件

- 試す URL は **いま一覧に載っている商品** であること
- 監視中に storage へ URL を足しても **検知されない**（一覧 DOM と開始時 baseline の比較のため）
- **開始前に** baseline からその URL だけ除く

### popup 推奨（商品タブが2枚になるのを防ぐ）

| 設定 | 推奨 |
|------|------|
| 他拡張へ通知 | **ON**（discord で開く） |
| 増加検知時に商品URLを開く | **OFF**（PageRecorder では開かない） |

両方 ON だと **同じ商品 URL のタブが2枚**（PageRecorder + discord）になりやすい。

### 手順

1. §2.5 で停止
2. 下の `REMOVE_URL` を試したい商品に差し替えて実行
3. popup: リロード間隔 **60**、終了時刻を未来に、上記の通知設定
4. 拡張リロード → アラームクリア → `await self.startScheduledStockWatch()`
5. 最大約1分＋読込後、`scheduledStockLogs` の `newUrls` を確認

[特定商品 URL でベースラインから1件減らす]
```javascript
(async function () {
  const MONITOR_KEY =
    'https://aeonretail.com/Form/Product/ProductList.aspx?gspsk=%e3%83%9d%e3%82%b1%e3%83%a2%e3%83%b3%e3%82%ab%e3%83%bc%e3%83%89&psc=0';
  const REMOVE_URL =
    'https://aeonretail.com/product/0/P-2319294424002/P-231929442400201/';

  const store = await chrome.storage.local.get('scheduledStockSnapshots');
  const snapshots = store.scheduledStockSnapshots || {};
  const snap = snapshots[MONITOR_KEY];
  if (!snap?.urls?.length) {
    console.error('baseline がありません');
    return;
  }

  const norm = function(u) { return u.replace(/\/$/, ''); };
  var nextUrls = snap.urls.filter(function(u) { return norm(u) !== norm(REMOVE_URL); });
  if (nextUrls.length === snap.urls.length) {
    console.error('REMOVE_URL が baseline にありません。一覧に載っている URL か確認してください');
    return;
  }

  snapshots[MONITOR_KEY] = { count: snap.count, urls: nextUrls, checkedAt: snap.checkedAt };
  await chrome.storage.local.set({ scheduledStockSnapshots: snapshots });
  console.log('OK', { before: snap.urls.length, after: nextUrls.length, removed: REMOVE_URL });
})();
```

### discord だけ先に試す（一覧・差分を飛ばす）

```javascript
chrome.runtime.sendMessage('ibmbjnemcpminbmenepldhockemdpomc', {
  type: 'PAGE_RECORDER_STOCK_DETECTED',
  source: 'PageRecorder',
  siteId: 'aeon',
  urls: ['https://aeonretail.com/product/0/P-2319294424002/P-231929442400201/'],
  targetUrl: 'https://aeonretail.com/Form/Product/ProductList.aspx?gspsk=%e3%83%9d%e3%82%b1%e3%83%a2%e3%83%b3%e3%82%ab%e3%83%bc%e3%83%89&psc=0',
  title: 'manual test',
  count: 1
}).then(console.log).catch(console.error);
```

拡張 ID は環境に合わせて変更する。

> **baseline について**
> `sendMessage` だけのテストは **`scheduledStockSnapshots` を更新しない**。
> §3.2 / `REMOVE_URL` で減らしたまま（例: `urls: 19`）になる。本番前や次の差分テスト前に [§3.6](#36-テスト後に-baseline基準を元に戻す) で戻す。

---

## 1. 一覧 DOM の確認（任意・一覧タブのコンソールのみ）

SW では実行しない。

```javascript
document.querySelectorAll("a[href*='/Form/Product/ProductDetail.aspx']").length
// 期待: 0

document.querySelectorAll("a[href*='/product/0/P-']").length
// 期待: 商品数と同程度（例: 20）
```

---

## 2. 監視ウィンドウの手動開始

```javascript
await chrome.alarms.clear('dailyStockCheck');
await chrome.alarms.clear('stockWatchTick');
await self.startScheduledStockWatch();
```

`runScheduledStockCheck()` は中身が同じ。**どちらか1回だけ**。

### セッション確認

```javascript
chrome.storage.local.get('scheduledStockWatchSession').then(function(r) {
  var s = r.scheduledStockWatchSession;
  console.log({
    active: s && s.active,
    phase: s && s.phase,
    inspectionTabId: s && s.inspectionTabId,
    pastEnd: s ? Date.now() >= s.windowEndMs : null
  });
});
```

| 値 | 意味 |
|----|------|
| `phase: "starting"` | 開始処理中（一覧タブは1枚の想定） |
| `phase: "active"` | リロード監視中 |
| `undefined` | 未開始 or **検知後に終了済み** |
| `pastEnd: true` | 終了時刻を過ぎている → 開始されない |

### スナップショット（基準）確認

```javascript
chrome.storage.local.get('scheduledStockSnapshots').then(function(r) {
  var snapshots = r.scheduledStockSnapshots || {};
  Object.keys(snapshots).forEach(function(url) {
    var data = snapshots[url];
    console.log(url.slice(-50), 'count:', data.count, 'urls:', (data.urls || []).length, 'at:', data.checkedAt);
  });
});
```

**キーが2行以上** → 過去に別の指定URLで監視した残骸（§5 参照）。本番で使うキーは **popup の指定URL と完全一致** する1件だけにする。

---

## 2.5 監視の完全停止（テスト前に推奨）

`inspectionTabId` だけ閉じると、同じ一覧 URL のタブが残り **再開始で2枚** になりうる。

```javascript
(async function () {
  const TARGET =
    'https://aeonretail.com/Form/Product/ProductList.aspx?gspsk=%e3%83%9d%e3%82%b1%e3%83%a2%e3%83%b3%e3%82%ab%e3%83%bc%e3%83%89&psc=0';
  const key = TARGET.replace(/\/$/, '');

  var r = await chrome.storage.local.get('scheduledStockWatchSession');
  var s = r.scheduledStockWatchSession;
  if (s && s.inspectionTabId) {
    try { await chrome.tabs.remove(s.inspectionTabId); } catch (e) {}
  }

  var tabs = await chrome.tabs.query({});
  for (var i = 0; i < tabs.length; i++) {
    var tab = tabs[i];
    var u = tab.url || tab.pendingUrl || '';
    if (u.replace(/\/$/, '') === key) {
      try { await chrome.tabs.remove(tab.id); } catch (e) {}
    }
  }

  await chrome.storage.local.remove('scheduledStockWatchSession');
  await chrome.alarms.clear('stockWatchTick');
  await chrome.alarms.clear('dailyStockCheck');
  console.log('停止しました');
})();
```

---

## 3. 増加検知のテスト（詳細）

一覧タブの DOM を手でいじっても、**リロードのたびに消える**ため使えない。storage の baseline をいじる。

### 3.1 キー一覧（全文）

```javascript
chrome.storage.local.get('scheduledStockSnapshots').then(function(r) {
  Object.keys(r.scheduledStockSnapshots || {}).forEach(function(k) { console.log(k); });
});
```

### 3.2 基準を1件減らす（末尾を削る簡易版）

`MONITOR_KEY` は §3.1 の **全文コピー**（プレースホルダ `...` は使わない）。

```javascript
(async function () {
  const MONITOR_KEY = 'https://aeonretail.com/Form/Product/ProductList.aspx?gspsk=%e3%83%9d%e3%82%b1%e3%83%a2%e3%83%b3%e3%82%ab%e3%83%bc%e3%83%89&psc=0';

  const store = await chrome.storage.local.get('scheduledStockSnapshots');
  const snapshots = store.scheduledStockSnapshots || {};
  const snap = snapshots[MONITOR_KEY];

  if (!snap || !snap.urls || !snap.urls.length) {
    console.error('urls が空です');
    return;
  }

  snapshots[MONITOR_KEY] = {
    count: Math.max(0, snap.count - 1),
    urls: snap.urls.slice(0, -1),
    checkedAt: snap.checkedAt
  };

  await chrome.storage.local.set({ scheduledStockSnapshots: snapshots });
  console.log('基準を1件少なくしました', {
    count: snapshots[MONITOR_KEY].count,
    urls: snapshots[MONITOR_KEY].urls.length
  });
})();
```

特定の商品を指定して試す場合は [特定商品 URL で試す](#特定商品-url-で試すdiscord-連携) の `REMOVE_URL` 版を使う。

### 3.3 開始

§クイック手順の「アラームクリア → 開始」と同じ。

### 3.4 ログ確認

§クイック手順と同じ。

### 3.5 連携確認

- `newUrls[0]` の商品ページが開く（「商品URLを開く」ON 時）
- discord でカートイン（通知 ON 時）
- 検知後 `scheduledStockWatchSession` が消える

### 3.6 テスト後に baseline（基準）を元に戻す

§3.2 や `REMOVE_URL` で **1件減らした状態**（例: `urls: 19`）のままだと、次回の PageRecorder 差分検知で **同じ商品が再び `newUrls` になる**。本番前や次のテスト前に戻す。

#### 状態確認

```javascript
chrome.storage.local.get('scheduledStockSnapshots').then(function(r) {
  var snapshots = r.scheduledStockSnapshots || {};
  Object.entries(snapshots).forEach(function(entry) {
    var key = entry[0];
    var value = entry[1];
    console.log({
      key: key.slice(-50),
      count: value.count,
      urls: (value.urls || []).length,
      checkedAt: value.checkedAt
    });
  });
});
```

| `urls` | 目安 |
|--------|------|
| 19 | テストで1件減らしたまま → **復元が必要** |
| 20 前後 | 一覧1ページ分と同程度なら OK |

PageRecorder で **検知成功** した場合は、検知時に snapshot が **いまの一覧** で上書きされることが多い（`urls` は自然に戻る）。
**`sendMessage` のみ** の discord テストでは baseline は **減ったまま**。

#### 方法A: 減らした URL を1本だけ戻す（いちばん早い）

§3.2 / `REMOVE_URL` で外した商品を `RESTORE_URL` に指定する。

```javascript
(async function () {
  const MONITOR_KEY =
    'https://aeonretail.com/Form/Product/ProductList.aspx?gspsk=%e3%83%9d%e3%82%b1%e3%83%a2%e3%83%b3%e3%82%ab%e3%83%bc%e3%83%89&psc=0';
  const RESTORE_URL =
    'https://aeonretail.com/product/0/P-2319294424002/P-231929442400201/';

  const store = await chrome.storage.local.get('scheduledStockSnapshots');
  const snapshots = store.scheduledStockSnapshots || {};
  const snap = snapshots[MONITOR_KEY];
  if (!snap) {
    console.error('キーがありません');
    return;
  }

  const norm = function(u) { return u.replace(/\/$/, ''); };
  var urls = snap.urls || [];
  if (urls.some(function(u) { return norm(u) === norm(RESTORE_URL); })) {
    console.log('すでに baseline に含まれています', { urls: urls.length });
    return;
  }

  snapshots[MONITOR_KEY] = {
    count: snap.count,
    urls: urls.concat([RESTORE_URL]),
    checkedAt: new Date().toISOString()
  };
  await chrome.storage.local.set({ scheduledStockSnapshots: snapshots });
  console.log('復元しました', { urls: snapshots[MONITOR_KEY].urls.length });
})();
```

`count` は 28 のままでよい（差分検知は `urls` 配列を比較）。

#### 方法B: いまの一覧から baseline を取り直す（いちばん正確）

1. §2.5 で停止
2. popup: 監視終了を「今から5分後」など未来に → 保存 → 拡張リロード
3. **baseline をいじらず** に開始:

```javascript
await chrome.alarms.clear('dailyStockCheck');
await chrome.alarms.clear('stockWatchTick');
await self.startScheduledStockWatch();
```

4. **検知させず** 終了時刻まで待つ（未検知終了で **その時点の一覧** が snapshot に保存される）

#### 方法C: キーを消してから再取得

```javascript
(async function () {
  const KEY =
    'https://aeonretail.com/Form/Product/ProductList.aspx?gspsk=%e3%83%9d%e3%82%b1%e3%83%a2%e3%83%b3%e3%82%ab%e3%83%bc%e3%83%89&psc=0';
  const store = await chrome.storage.local.get('scheduledStockSnapshots');
  const snapshots = store.scheduledStockSnapshots || {};
  delete snapshots[KEY];
  await chrome.storage.local.set({ scheduledStockSnapshots: snapshots });
  console.log('削除しました。次に startScheduledStockWatch() で baseline を取り直す');
})();
```

初回 tick は検知しない。終了時または翌回監視で storage が更新される。

#### 復元確認

方法A 後は `urls` が **1増えている** こと（例: 19 → 20）。§3.6 冒頭の確認スクリプトで再チェック。

| 目的 | おすすめ |
|------|----------|
| すぐ戻す | **方法A** |
| 実ページと完全一致 | **方法B** |
| まっさらにしたい | **方法C** |

---

## 4. 本番運用

1. popup: 例）開始 `11:57` / 終了 `15:15` / 間隔 `10`〜`30` 秒
2. 毎日開始時刻に `dailyStockCheck` → 監視セッション開始
3. 終了まで新規が無ければ一覧をリロード
4. `newUrls` が出たら通知して **監視終了**
5. 未検知で終了した日は `scheduledStockSnapshots` が更新される（翌日基準）

§3 の storage 操作は本番では不要。

---

## 5. 古いスナップショットキーの削除

`scheduledStockSnapshots` は **URL ごとに溜まる**だけで、古いキーは自動削除されない（例: 過去に「ワンピースカードゲーム」一覧で試したキーが残る）。

### 不要キー1件だけ削除

```javascript
(async function () {
  const DELETE_KEY = 'https://aeonretail.com/Form/Product/ProductList.aspx?gspsk=...'; // §3.1 の全文

  const store = await chrome.storage.local.get('scheduledStockSnapshots');
  const snapshots = store.scheduledStockSnapshots || {};
  if (!snapshots[DELETE_KEY]) {
    console.error('キーが見つかりません');
    return;
  }
  delete snapshots[DELETE_KEY];
  await chrome.storage.local.set({ scheduledStockSnapshots: snapshots });
  console.log('削除しました。残り:', Object.keys(snapshots));
})();
```

### 残すキー1件だけにする

```javascript
(async function () {
  const KEEP_KEY = 'https://aeonretail.com/Form/Product/ProductList.aspx?gspsk=%e3%83%9d%e3%82%b1%e3%83%a2%e3%83%b3%e3%82%ab%e3%83%bc%e3%83%89&psc=0';

  const store = await chrome.storage.local.get('scheduledStockSnapshots');
  const snapshots = store.scheduledStockSnapshots || {};
  const kept = snapshots[KEEP_KEY];
  const next = kept ? { [KEEP_KEY]: kept } : {};
  await chrome.storage.local.set({ scheduledStockSnapshots: next });
  console.log('残したキー:', Object.keys(next));
})();
```

---

## 6. アラーム経由で開始（代替）

手動 `startScheduledStockWatch` と **同時に使わない**（二重開始防止のため）。

```javascript
await chrome.alarms.clear('stockWatchTick');
chrome.alarms.create('dailyStockCheck', { when: Date.now() + 3000 });
```

3秒後に定時開始と同じ処理が走る。テスト中は popup の **監視終了が未来** であること。

---

## よくあるトラブル

### `await self.startScheduledStockWatch()` が `undefined`

正常。成功は `scheduledStockWatchSession` または `scheduledStockLogs` で見る。

### INFO ログが出ない

デフォルトは WARNING。必要なら:

```javascript
chrome.runtime.sendMessage({ action: 'setLogLevel', level: 3 });
```

### `contentScriptReady` が大量に出る

エラーではない。全 URL の content script が読み込みのたびに通知し、background が **常に `console.log` する**ため。無視してよい。フィルタで `contentScriptReady` を除外できる。

### 一覧タブが2枚（同じ ProductList URL）

- §2.5 で **一覧 URL のタブをすべて閉じてから** 再開始
- `startScheduledStockWatch` は **1回だけ** `await`
- `dailyStockCheck` を手動開始と同時に走らせない

### 商品タブが2枚（同じ `/product/0/P-...`）

- **商品URLを開く** と **他拡張通知** の両方 ON → 想定どおり二重オープン
- discord テスト時は **商品URLを開く OFF** 推奨

### 監視終了時刻を過ぎている

popup の **監視終了** を「今から10分後」などに変更 → 保存 → 拡張リロード。

### `chrome.alarms.clear(...)` が `false`

アラームが無かっただけ。問題なし。

### `Identifier 'key' has already been declared`

同じ SW コンソールで `const` を再宣言した。スクリプト **ブロック全体** を再貼るか、SW を「更新」してコンソールをリセット。

### `newUrls` が空

- baseline の `urls` が空
- 減らした URL が **一覧に載っていない**
- 監視中に baseline をいじった（セッションは **開始時** の baseline 固定）

### テスト後も `urls: 19` のまま（意図せず再検知される）

- §3.2 / `REMOVE_URL` で減らしたまま未復元 → [§3.6](#36-テスト後に-baseline基準を元に戻す) で戻す
- discord の `sendMessage` だけでは baseline は更新されない

---

## 関連

- 監視ウィンドウ: `.steering/260529-aeon-stock-watch-window/`
- URL 差分・セレクタ: `.steering/260529-aeon-list-product-url-diff/`
- baseline 証跡保存: `.steering/260601-0938_baseline-screenshot-log/`
- 旧メモ: `tests/memo.md`

ーーーーーー
