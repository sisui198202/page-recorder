# 定時差分検知 — newUrls 検証手順

baseline 差分による `newUrls` 検知、誤通知防止、外部拡張への payload 検証の手順書。

このファイルを、`.steering/260820-1547_new-product-url-auto-detection/tasks.md` Phase 4 の正本手順として扱う。
Alfred `tes'` 起点の最短導線は [./ベースライン時と検知時ダウンロードテスト方法.md](./ベースライン時と検知時ダウンロードテスト方法.md)、AEON / Service Worker 固有の詳細は [./aeon-scheduled-stock-check-sw-manual.md](./aeon-scheduled-stock-check-sw-manual.md) を参照する。

## テスト方式の選択

- popup の **B/C 商品取得テスト**: 指定 B URL または選択 C サイトに対して、1分以内に snapshot と1回の tick を確認する。変化検知、Gmail送信、通知、ダウンロード、baseline 永続化は行わない。B は保存済みの「単一URL監視 ＞ 指定URL」を一時タブで開き、商品取得設定で1回 snapshot を取得する。B の実行・成功には、指定URLと商品取得セレクタ（「監視対象セレクタ」）が必要であり、監視キーワード・検知モード・開始時の即座検知・リロード後待機時間は使用しない。件数セレクタは補助情報で、開始・成功の必須条件ではない。
- popup の **C 差分検知テスト**: 初回取得から一時baselineを作成し、URLを1件除外して再取得する。除外したURLだけを新規URLとして検知し、本番baselineは保存しない。Gmail送信は利用者が確認をONにした場合だけ行う。
- popup の **C 通常経路・保存付き差分テスト**: `短縮検証` はbaseline保存後に同じ実行内で差分検知まで完了する。`実運用再現` はbaseline完了時に`phase: detect`のテストsessionを保存し、次の専用アラームtickで差分検知・後始末を行う。どちらもテスト専用sessionと一時タブを使い、基準3件・検知2件の成果物を保存する。
- Alfred `tes'` の **C 実運用寄りテスト**: `設定バックアップ → 対象サイト絞り込み → 時刻設定 → 拡張再読み込み → Cアラーム再同期 → 確認 → 設定復元` の順で行う。差分・通知の確認はこの方式だけで実施する。

### B/C 安全テストの判定・保証範囲（正本）

この節を B/C 安全テストの判定と保証範囲の正本とする。popup の表示、受け入れ条件、自動テストはこの定義に従う。

| 状態 | 判定 | 保証する・しないこと | 確認先 |
| --- | --- | --- | --- |
| **成功** | 対象ページの準備完了後、設定済みの商品取得セレクタで1件以上の snapshot を取得できた。 | **保証する**: その時点の対象ページで、設定済み商品取得経路が1件以上を取得できること。**保証しない**: 通常定時監視、継続的なサイト互換性、差分検知、通知の動作。 | 必要に応じて実運用寄りテストへ進む。 |
| **要確認** | テスト処理自体は完了したが、セレクタ未設定・セレクタ結果0件・snapshot 0件のいずれかだった。 | 商品取得の成功は保証しない。実行基盤の失敗ではないため、設定または対象ページを確認する。 | 商品取得セレクタと対象ページのDOM。 |
| **失敗** | URL・実行状態・タブ作成・読込・DOM準備・snapshot取得のいずれかで、テストを完了できなかった。開始前の拒否は結果欄に「失敗（開始不可: …）」と表示される。 | 商品取得の成功は保証しない。 | URL・通常監視/別テストの実行状態・タブ作成/読込・DOM準備・snapshot取得を順に確認する。 |

全状態で、変化検知、Gmail送信、通知、ダウンロード、baseline 保存、通常監視の開始は行わない。商品取得テストの成功は、通常運用または差分・通知を確認したことにはならない。

### popup 結果カードの手動確認

1. 拡張を再読み込みし、テストタブの「B/C: 定時監視」を開く。
2. B の「指定URLの商品取得テスト」で成功した場合、緑の「成功」カードに指定URL、判定理由、商品取得セレクタ結果件数、snapshot取得件数が表示されることを確認する。
3. 結果カードの末尾に「変化検知・Gmail送信・ダウンロード・baseline保存・通常監視は行いません。」と表示されることを確認する。
4. セレクタ未設定・結果0件・snapshot 0件では黄色の「要確認」、開始拒否・DOM準備・snapshot取得の失敗では赤の「失敗」カードと判定理由が表示されることを確認する。

### C通常経路・保存付き差分テスト

1. テストタブの `B/C: 定時監視` でCサイトを選択する。保存付き差分テストカードで、既定が`短縮検証`であり、`実運用再現`と相互排他で選べることを確認する。
2. `短縮検証`を選び、`保存付き差分テスト`を実行する。baseline保存後、同じ実行内で差分検知まで完了することを確認する。
3. `実運用再現`を選び、`保存付き差分テスト`を実行する。baseline保存後に結果カードが実行中のままになり、次の専用アラームtickで差分検知・完了することを確認する（長時間の実運用枠を待つ必要はない）。
4. 両方式で、結果カードの基準PNG・HTML・TXT、強制差分検知、検知PNG・HTML、テスト終了の全項目が成功することを確認する。
5. カードに表示された5件のファイル名と downloadId を、Chrome のダウンロード一覧で確認する。
6. Gmail、Chrome通知、外部拡張通知、検知URL展開が発生せず、通常Cのbaselineと実行中セッションが変更されないことを確認する。

### Cアラーム再同期結果の復元確認

1. popup の C セクションで「Cアラームを再同期」を実行し、結果カードの状態・理由・有効サイト数・アラーム件数・未設定対象を記録する。
2. popup を閉じて開き直し、同じ内容の結果カードが復元されることを確認する。
3. Chrome または拡張を再読み込み後に popup を開き、未実行状態として結果カードが表示されないことを確認する。

### C実行結果カードの確認

1. C の対象サイトに連続する2監視枠を設定して Cアラームを再同期し、popup の C一覧を開く。サイト名の右側が「次回予約」、URL とスケジュールが独立行で全表示されることを確認する。
2. 各監視枠の開始後、右側が青い「実行中」になり、直近実行カードに青い状態バッジ、実行時間、予定枠、終了「実行中」、セレクタ一致・snapshot・tick の3数値、取得テキストのプレビューが表示されることを確認する。
3. 2枠とも時間満了まで待ち、緑の「正常完了」カードへ遷移することを確認する。実行時間の終了時刻と予定枠を混同せず表示し、終了が「時間満了」、3数値と取得テキストが残ることを確認する。
4. 新商品を検知させた場合は、緑の「正常完了」と終了「新商品検知」になることを確認する。セレクタ未取得・取得例外は赤の「失敗」、テキスト未確認は黄の「要確認」と表示されることを確認する。
5. 4行または360文字を超える取得テキストで、先頭3行・最大360文字のプレビューと「取得テキストを全文表示（○文字）」が表示されることを確認する。展開後はsessionに保存済みの全文を改行維持で確認でき、保存時の2,000文字の安全上限は変更しない。

---

## この文書の使い方

| やりたいこと                         | 読む節                                                           |
| ------------------------------------ | ---------------------------------------------------------------- |
| 2回目以降で newUrls のみ検知されるか | [テスト1](#テスト1-2回目以降で-newurls-のみ検知されることを確認) |
| 新規URLがないときに誤通知しないか    | [テスト2](#テスト2-新規urlがないケースで誤通知しないことを確認)  |
| 外部拡張 payload の内容確認          | [テスト3](#テスト3-外部拡張通知の-payload-検証)                  |
| baseline を元に戻す                  | [baseline 復元](#baseline-復元)                                  |

---

## 前提条件

1. `chrome://extensions` で PageRecorder を **更新（リロード）**
2. popup 設定が完了している
   - **定時監視を有効化** ON
   - **監視終了時刻** = 今から15分以上未来
   - **リロード間隔** = `60` 秒（テスト用）
   - **指定URL** = AEON 一覧（ポケモンカード等）
3. **SW コンソール** を開いている
   - `chrome://extensions` → PageRecorder → **Service Worker** → Console

### 実行場所（重要）

| 操作                            | 実行場所               |
| ------------------------------- | ---------------------- |
| `startScheduledStockWatch()`    | SW コンソール          |
| `chrome.storage.local.get(...)` | SW コンソール          |
| DOM セレクタ確認                | 一覧ページのコンソール |

---

## テスト1: 2回目以降で newUrls のみ検知されることを確認

### 目的

baseline 保存後、2回目以降の tick で **商品URLが増加した場合のみ** `newUrls` に検知されることを確認する。

### 期待結果

- `scheduledStockLogs` の最新エントリに `newUrls` が **1件以上** 含まれる
- `newUrls` には baseline から削除した URL（= 一覧には存在する URL）が含まれる

---

### STEP 1: baseline の現状確認

**目的:** 現在の baseline に `urls` が存在することを確認する

**実行:**

```javascript
chrome.storage.local.get("scheduledStockSnapshots").then(function (r) {
  var snapshots = r.scheduledStockSnapshots || {};
  Object.keys(snapshots).forEach(function (url) {
    var data = snapshots[url];
    console.log({
      key: url.slice(-60),
      count: data.count,
      urls: (data.urls || []).length,
      checkedAt: data.checkedAt,
    });
  });
});
```

**期待結果:**

- `urls` が 1 以上であること（例: `urls: 20`）
- `checkedAt` が存在すること

---

### STEP 2: 監視を完全停止

**目的:** 既存のセッションやタブを確実にクリアし、テスト開始状態を整える

**実行:**

```javascript
(async function () {
  const TARGET =
    "https://aeonretail.com/Form/Product/ProductList.aspx?gspsk=%e3%83%9d%e3%82%b1%e3%83%a2%e3%83%b3%e3%82%ab%e3%83%bc%e3%83%89&psc=0";
  const key = TARGET.replace(/\/$/, "");

  var r = await chrome.storage.local.get("scheduledStockWatchSession");
  var s = r.scheduledStockWatchSession;
  if (s && s.inspectionTabId) {
    try {
      await chrome.tabs.remove(s.inspectionTabId);
    } catch (e) {}
  }

  var tabs = await chrome.tabs.query({});
  for (var i = 0; i < tabs.length; i++) {
    var tab = tabs[i];
    var u = tab.url || tab.pendingUrl || "";
    if (u.replace(/\/$/, "") === key) {
      try {
        await chrome.tabs.remove(tab.id);
      } catch (e) {}
    }
  }

  await chrome.storage.local.remove("scheduledStockWatchSession");
  await chrome.alarms.clear("stockWatchTick");
  await chrome.alarms.clear("dailyStockCheck");
  console.log("停止しました");
})();
```

**期待結果:**

- `停止しました` と表示される
- 一覧タブが閉じている

---

### STEP 3: baseline から URL を1件削除

**目的:** 差分を強制的に発生させ、検知対象を作る

**実行:**

```javascript
(async function () {
  const MONITOR_KEY =
    "https://aeonretail.com/Form/Product/ProductList.aspx?gspsk=%e3%83%9d%e3%82%b1%e3%83%a2%e3%83%b3%e3%82%ab%e3%83%bc%e3%83%89&psc=0";

  const store = await chrome.storage.local.get("scheduledStockSnapshots");
  const snapshots = store.scheduledStockSnapshots || {};
  const snap = snapshots[MONITOR_KEY];

  if (!snap || !snap.urls || !snap.urls.length) {
    console.error("urls が空です。先に baseline を作成してください");
    return;
  }

  var removedUrl = snap.urls[snap.urls.length - 1];

  snapshots[MONITOR_KEY] = {
    count: Math.max(0, snap.count - 1),
    urls: snap.urls.slice(0, -1),
    checkedAt: snap.checkedAt,
  };

  await chrome.storage.local.set({ scheduledStockSnapshots: snapshots });
  console.log("基準を1件少なくしました", {
    before: snap.urls.length,
    after: snapshots[MONITOR_KEY].urls.length,
    removedUrl: removedUrl,
  });
})();
```

**期待結果:**

- `before` と `after` の差が 1
- `removedUrl` に削除した URL が表示される（後で検知されるはずの URL）

---

### STEP 4: アラームをクリアして監視開始

**目的:** 監視セッションを新規開始する

**実行:**

```javascript
await chrome.alarms.clear("dailyStockCheck");
await chrome.alarms.clear("stockWatchTick");
await self.startScheduledStockWatch();
```

**期待結果:**

- 戻り値は `undefined`（正常）
- 一覧タブが **1枚** 開く

---

### STEP 5: newUrls の検知を確認

**目的:** STEP 3 で削除した URL が `newUrls` として検知されることを確認する

**待機:** 10秒〜1分（リロード間隔による）

**実行:**

```javascript
chrome.storage.local.get("scheduledStockLogs").then(function (r) {
  var logs = r.scheduledStockLogs || [];
  var latest = logs[logs.length - 1];
  if (!latest) {
    console.log("ログがありません。もう少し待ってください");
    return;
  }
  console.log({
    timestamp: latest.timestamp,
    detected: latest.detected,
    newUrls: latest.newUrls,
    newUrlsCount: (latest.newUrls || []).length,
  });
});
```

**期待結果:**

- `detected: true`
- `newUrls` に **1件以上** の URL が含まれる
- `newUrls` には STEP 3 で削除した `removedUrl` が含まれる

---

### STEP 6: セッション終了を確認

**目的:** 検知後にセッションが正常終了していることを確認する

**実行:**

```javascript
chrome.storage.local.get("scheduledStockWatchSession").then(function (r) {
  console.log("session:", r.scheduledStockWatchSession);
});
```

**期待結果:**

- `session: undefined`（検知後に自動終了）

---

## テスト2: 新規URLがないケースで誤通知しないことを確認

### 目的

baseline 保存直後に tick を再実行しても **通知されない** こと、`scheduledStockLogs` に **余計な検知ログが増えない** ことを確認する。

### 期待結果

- `scheduledStockLogs` に `detected: true` のエントリが **増えない**
- baseline 保存後は差分がないので通知されない

---

### STEP 1: 監視を完全停止

**目的:** 既存セッションをクリアする

**実行:** [テスト1 STEP 2](#step-2-監視を完全停止) と同じスクリプト

**期待結果:** `停止しました` と表示

---

### STEP 2: 現在のログ件数を記録

**目的:** テスト前のログ件数を把握し、テスト後に増えていないことを確認する基準とする

**実行:**

```javascript
chrome.storage.local.get("scheduledStockLogs").then(function (r) {
  var logs = r.scheduledStockLogs || [];
  var detectedCount = logs.filter(function (log) {
    return log.detected === true;
  }).length;
  console.log({
    totalLogs: logs.length,
    detectedLogs: detectedCount,
  });
});
```

**期待結果:**

- `totalLogs` と `detectedLogs` を **メモしておく**

---

### STEP 3: baseline をそのまま維持して監視開始

**目的:** baseline を変更せずに監視を開始し、差分が発生しない状態を作る

**実行:**

```javascript
await chrome.alarms.clear("dailyStockCheck");
await chrome.alarms.clear("stockWatchTick");
await self.startScheduledStockWatch();
```

**期待結果:**

- 戻り値は `undefined`
- 一覧タブが開く

---

### STEP 4: tick 完了を待機

**目的:** リロード間隔（例: 60秒）経過後、差分比較が実行されるのを待つ

**待機:** 1〜2分

---

### STEP 5: ログ件数が増えていないことを確認

**目的:** 新規URLがない状態では検知ログが増えないことを確認する

**実行:**

```javascript
chrome.storage.local.get("scheduledStockLogs").then(function (r) {
  var logs = r.scheduledStockLogs || [];
  var detectedCount = logs.filter(function (log) {
    return log.detected === true;
  }).length;
  console.log({
    totalLogs: logs.length,
    detectedLogs: detectedCount,
  });

  // 最新ログの確認
  var latest = logs[logs.length - 1];
  if (latest) {
    console.log("最新ログ:", {
      timestamp: latest.timestamp,
      detected: latest.detected,
      newUrls: latest.newUrls,
    });
  }
});
```

**期待結果:**

- `detectedLogs` が STEP 2 の値から **増えていない**
- 最新ログが存在する場合、`detected: false` または `newUrls: []`

---

### STEP 6: セッションが継続中であることを確認

**目的:** 未検知状態ではセッションが継続していることを確認する

**実行:**

```javascript
chrome.storage.local.get("scheduledStockWatchSession").then(function (r) {
  var s = r.scheduledStockWatchSession;
  console.log({
    active: s && s.active,
    phase: s && s.phase,
  });
});
```

**期待結果:**

- `active: true`
- `phase: "active"` または `"starting"`

---

### STEP 7: 監視を停止

**目的:** テスト完了後、セッションをクリアする

**実行:** [テスト1 STEP 2](#step-2-監視を完全停止) と同じスクリプト

---

## テスト3: 外部拡張通知の payload 検証

### 目的

外部拡張（discord_post_url_monitor）へ送信される payload に `urls` / `siteId` / `discordChannelId` が含まれることを確認する。

### 期待結果

- 受信側拡張のコンソールで payload を確認できる
- payload に期待するキーが含まれる

---

### STEP 1: 受信側拡張のコンソールを開く

**目的:** payload を受信側で確認するため、discord_post_url_monitor の SW コンソールを開く

**実行:**

1. `chrome://extensions` を開く
2. **discord_post_url_monitor** の **Service Worker** をクリック
3. Console タブを開く

---

### STEP 2: （事前確認）直接 sendMessage で payload 形式を確認

**目的:** 差分検知を経由せず、payload 形式を事前に確認する

**実行場所:** PageRecorder の SW コンソール

**実行:**

```javascript
// discord_post_url_monitor の拡張ID（環境に合わせて変更）
const DISCORD_EXT_ID = "ibmbjnemcpminbmenepldhockemdpomc";

const testPayload = {
  type: "PAGE_RECORDER_STOCK_DETECTED",
  source: "PageRecorder",
  siteId: "aeon",
  discordChannelId: null, // または実際のチャンネルID
  urls: ["https://aeonretail.com/product/0/P-TEST-URL/"],
  targetUrl: "https://aeonretail.com/Form/Product/ProductList.aspx",
  title: "payload preview test",
  count: 1,
};

console.log("送信する payload:", testPayload);

chrome.runtime
  .sendMessage(DISCORD_EXT_ID, testPayload)
  .then(function (response) {
    console.log("応答:", response);
  })
  .catch(function (err) {
    console.error("送信エラー:", err);
  });
```

**期待結果:**

- 送信側で `送信する payload:` が表示され、キーを確認できる
- 受信側のコンソールで payload が表示される（受信側のログ設定による）

---

### STEP 3: 差分検知を発火して実 payload を確認

**目的:** 実際の差分検知フローで外部拡張に送信される payload を確認する

**事前条件:**

- popup で **他拡張へ通知** が ON
- [テスト1](#テスト1-2回目以降で-newurls-のみ検知されることを確認) の STEP 1〜4 を実行し、差分検知が発火する状態

**確認場所:** discord_post_url_monitor の SW コンソール

**確認観点:**

受信側コンソールで以下のキーが含まれることを確認:

| キー               | 期待値                                        |
| ------------------ | --------------------------------------------- |
| `type`             | `'PAGE_RECORDER_STOCK_DETECTED'`              |
| `source`           | `'PageRecorder'`                              |
| `siteId`           | `'aeon'`                                      |
| `urls`             | 検知された URL の配列                         |
| `discordChannelId` | 設定されている場合は文字列、未設定なら `null` |

---

### STEP 4: payload の各キーを検証

**目的:** 受信した payload が期待する構造であることを確認する

**確認方法:** 受信側コンソールのログを目視確認

**チェック項目:**

- [ ] `urls` が配列であること
- [ ] `urls` が空でないこと（`urls.length >= 1`）
- [ ] `siteId` が `'aeon'` であること
- [ ] `discordChannelId` が存在すること（`null` または文字列）
- [ ] `type` が `'PAGE_RECORDER_STOCK_DETECTED'` であること

---

### STEP 5: 受信側の処理確認（任意）

**目的:** 受信側が payload を正しく処理しているか確認する

**確認観点:**

- discord への投稿が行われるか
- 商品 URL のタブが開かれるか

---

## baseline 復元

テスト後に baseline を元に戻す手順。

### 方法A: 削除した URL を1件戻す（推奨）

テスト1 STEP 3 で削除した URL を戻す。

```javascript
(async function () {
  const MONITOR_KEY =
    "https://aeonretail.com/Form/Product/ProductList.aspx?gspsk=%e3%83%9d%e3%82%b1%e3%83%a2%e3%83%b3%e3%82%ab%e3%83%bc%e3%83%89&psc=0";
  // STEP 3 で表示された removedUrl を指定
  const RESTORE_URL = "https://aeonretail.com/product/0/P-XXXX/"; // 実際の URL に置き換え

  const store = await chrome.storage.local.get("scheduledStockSnapshots");
  const snapshots = store.scheduledStockSnapshots || {};
  const snap = snapshots[MONITOR_KEY];
  if (!snap) {
    console.error("キーがありません");
    return;
  }

  var urls = snap.urls || [];
  var norm = function (u) {
    return u.replace(/\/$/, "");
  };

  if (
    urls.some(function (u) {
      return norm(u) === norm(RESTORE_URL);
    })
  ) {
    console.log("すでに baseline に含まれています", { urls: urls.length });
    return;
  }

  snapshots[MONITOR_KEY] = {
    count: snap.count + 1,
    urls: urls.concat([RESTORE_URL]),
    checkedAt: new Date().toISOString(),
  };
  await chrome.storage.local.set({ scheduledStockSnapshots: snapshots });
  console.log("復元しました", { urls: snapshots[MONITOR_KEY].urls.length });
})();
```

### 方法B: baseline を削除して再取得

baseline を一度削除し、次回監視開始時に再取得する。

```javascript
(async function () {
  const KEY =
    "https://aeonretail.com/Form/Product/ProductList.aspx?gspsk=%e3%83%9d%e3%82%b1%e3%83%a2%e3%83%b3%e3%82%ab%e3%83%bc%e3%83%89&psc=0";
  const store = await chrome.storage.local.get("scheduledStockSnapshots");
  const snapshots = store.scheduledStockSnapshots || {};
  delete snapshots[KEY];
  await chrome.storage.local.set({ scheduledStockSnapshots: snapshots });
  console.log(
    "削除しました。次に startScheduledStockWatch() で baseline を取り直します",
  );
})();
```

---

## よくあるトラブル

| 症状                   | 原因                                                     | 対処                                                   |
| ---------------------- | -------------------------------------------------------- | ------------------------------------------------------ |
| `newUrls` が空         | baseline の `urls` が空、または削除した URL が一覧にない | STEP 1 で `urls` を確認、一覧に存在する URL を削除する |
| 外部拡張に通知されない | popup の「他拡張へ通知」が OFF                           | popup で設定を ON にして保存                           |
| 受信側でログが見えない | 受信側のログレベルが WARNING 以上                        | 受信側でログレベルを下げる                             |
| 拡張ID が不明          | `chrome://extensions` で確認                             | 拡張の「ID」をコピー                                   |
| `検知ログが増えた`     | baseline が変わっている                                  | baseline を復元してから再テスト                        |

---

## 関連

- [AEON 定時差分検知 SW 手動テスト手順](./aeon-scheduled-stock-check-sw-manual.md)
- `.steering/260529-aeon-stock-watch-window/`
