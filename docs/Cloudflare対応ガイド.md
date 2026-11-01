# Cloudflare対応ガイド

## 概要

本ドキュメントは、Chrome拡張機能でCloudflare保護されたサイトを監視する際の技術的知見と実装アプローチをまとめたものである。

---

## cf_clearanceクッキー

### 役割

`cf_clearance` は、Cloudflareが発行するクッキーで、以下の役割を持つ。

- Cloudflareチャレンジ（JavaScript Challenge、Managed Challenge等）を通過したことの証明
- 一定期間（通常30分〜数時間）有効で、再チャレンジを省略できる
- ドメインごとに発行される

### 特性

| 項目 | 値 |
|------|-----|
| 名前 | `cf_clearance` |
| 発行元 | Cloudflare |
| 有効期限 | 通常30分〜数時間 |
| スコープ | ドメイン単位 |
| HttpOnly | Yes |

### 削除方法

#### 方法1: Chromeの閲覧履歴データを削除（推奨）

1. Chrome設定 → プライバシーとセキュリティ → 閲覧履歴データを削除
2. 期間を選択（過去1時間など）
3. **「Cookieと他のサイトデータ」にチェック**
4. 「データを削除」をクリック

| 項目 | Cloudflareへの影響 |
|------|-------------------|
| 閲覧履歴 | ❌ 影響なし |
| **Cookieと他のサイトデータ** | ✅ cf_clearance削除 → Cloudflare再表示 |
| キャッシュされた画像とファイル | ❌ 影響なし |

#### 方法2: JavaScript API（参考）

```javascript
await chrome.cookies.remove({
    name: 'cf_clearance',
    url: `https://${domain}/`
});
```

※ 本拡張機能ではこの機能は実装していない（2026-06-08削除済み）

---

## bypassCacheの限界

### chrome.tabs.reload({ bypassCache: true })

当初、cf_clearance削除後にCloudflare再認証を強制するために `bypassCache: true` を試みた。

```javascript
await chrome.tabs.reload(tabId, { bypassCache: true });
```

### 結果

| 項目 | 効果 |
|------|------|
| ディスクキャッシュ | ✅ バイパスする |
| メモリキャッシュ | ❌ バイパスしない |
| Cloudflare CDNキャッシュ | ❌ 影響しない |
| Cloudflare認証状態 | ❌ 影響しない |

### 結論

`bypassCache: true` だけでは、Cloudflare再認証を強制できない。

---

## Cloudflare認証メカニズム

Cloudflareは `cf_clearance` 以外にも認証状態を維持する仕組みを持つ可能性がある。

### 考えられる認証要素

1. **IPアドレスベース認証**
   - 同一IPからのアクセスは、cf_clearanceがなくても通過させる場合がある
   - VPN/プロキシ切替で確認可能

2. **ブラウザフィンガープリント**
   - User-Agent、言語設定、タイムゾーン等の組み合わせで識別
   - 同一ブラウザインスタンスでは認証状態が維持される可能性

3. **CDNレベルキャッシュ**
   - Cloudflareエッジサーバーがキャッシュを保持
   - クライアント側の操作では制御不可

4. **TLSセッション再利用**
   - 同一タブ/プロセスでは接続が再利用される可能性

---

## 実装履歴（2026-06-08）

### 試行1: キャッシュバイパスフラグ

**アプローチ:**
- `pendingCacheBypass` Setでドメインごとにフラグ管理
- cf_clearance削除時にフラグを設定
- リロード時に `bypassCache: true` を適用

**結果:** ❌ 効果なし

```
🔄 キャッシュバイパスでリロード: www.toysrus.co.jp
⏰ [toysrus-pokemon][schedule:0]【トイザラス ポケモンカードゲーム】Tick実行
  - 現在URL数: 16
```

- ログは正常に出力された
- ページコンテンツは正常に取得できた
- Cloudflare画面は表示されなかった

### 試行2: タブを閉じて新規タブで開く

**アプローチ:**
- 既存タブを `chrome.tabs.remove()` で閉じる
- `chrome.tabs.create()` で新規タブを開く
- メモリキャッシュ、TLSセッション等を完全にリセット

**実装:**

```javascript
async function forceNewTabReload(oldTabId, url, windowId) {
    // 既存タブ情報を取得
    let targetWindowId = windowId;
    if (!targetWindowId) {
        try {
            const oldTab = await chrome.tabs.get(oldTabId);
            targetWindowId = oldTab.windowId;
        } catch {
            // タブが既に閉じられている場合
        }
    }

    // 既存タブを閉じる
    try {
        await chrome.tabs.remove(oldTabId);
    } catch (e) {
        // エラーは無視
    }

    // 新しいタブを開く
    const createOptions = { url, active: true };
    if (targetWindowId) {
        createOptions.windowId = targetWindowId;
    }
    const newTab = await chrome.tabs.create(createOptions);
    return newTab.id;
}
```

**結果:** 検証中

---

## 推奨アプローチ

### 1. タブを閉じて新規タブで開く（推奨）

cf_clearance削除後にCloudflare再認証を強制する最も効果的な方法。

**メリット:**
- メモリキャッシュをクリア
- TLSセッションをリセット
- ブラウザ側の認証状態を完全にリセット

**デメリット:**
- タブが入れ替わる（一瞬の挙動変化）
- タブIDが変わるため、呼び出し元での更新が必要

### 2. URLにランダムパラメータを追加

```javascript
const cacheBustUrl = `${url}${url.includes('?') ? '&' : '?'}_cb=${Date.now()}`;
await chrome.tabs.update(tabId, { url: cacheBustUrl });
```

**メリット:**
- タブを維持できる
- 実装がシンプル

**デメリット:**
- Cloudflare CDNキャッシュには効果的だが、認証状態には影響しない可能性
- URLが汚れる

### 3. シークレットウィンドウで開く

```javascript
const incognitoWindow = await chrome.windows.create({
    url,
    incognito: true
});
```

**メリット:**
- 完全に新しいセッション
- すべてのキャッシュ/認証状態がリセット

**デメリット:**
- シークレットウィンドウ権限が必要
- ユーザー体験が大きく変わる
- 通常のセッションとは別管理になる

---

## 今後の実装時の注意点

### 1. タブID管理

新規タブで開く場合、タブIDが変わるため注意が必要。

```javascript
// 変更前
await reloadTabWithCacheBypass(tabId, targetUrl);
// tabId は古いまま

// 変更後
tabId = await reloadTabWithCacheBypass(tabId, targetUrl);
// 新しいタブIDを取得
```

### 2. セッション状態の更新

タブIDが変わった場合、セッション情報も更新する必要がある。

```javascript
session.inspectionTabId = tabId;
await setMultiSiteSession(siteId, session);
```

### 3. エラーハンドリング

タブが既に閉じられている場合のエラーハンドリングを忘れずに。

```javascript
try {
    await chrome.tabs.remove(oldTabId);
} catch (e) {
    logger.warn('タブ削除失敗（既に閉じられている可能性）');
}
```

### 4. ウィンドウID保持

同じウィンドウで新規タブを開くために、事前にウィンドウIDを取得しておく。

```javascript
const oldTab = await chrome.tabs.get(oldTabId);
const windowId = oldTab.windowId;
```

### 5. ログレベルの注意

重要なログは `logger.warn` を使用する。現在のログレベル設定（WARNING）では `logger.info` は出力されない。

```javascript
// 出力される
logger.warn(`🔄 Cloudflare再認証のため新規タブで開きます: ${hostname}`);

// 出力されない（ログレベルがWARNINGの場合）
logger.info(`ℹ️ 処理を開始します`);
```

---

## 関連ファイル

- `src/background/background.js`
  - `checkCloudflareStatus()`: Cloudflareセッション状態確認
  - `detectCloudflareChallenge()`: Cloudflareチャレンジ画面検出
  - `handleCloudflareChallenge()`: Cloudflare自動解決待機（最大30秒）

### 削除済み機能（2026-06-08）

以下の機能は検証の結果、効果が限定的だったため削除された。

- `forceNewTabReload()`: タブを閉じて新規タブで開く
- `reloadTabWithCacheBypass()`: cf_clearance削除後のリロード処理
- `deleteCfClearanceCookie()`: cf_clearanceクッキー削除
- `pendingCacheBypass`: キャッシュバイパスフラグ管理
- popup UI「🛡️ トイザラス cf_clearance削除」ボタン

---

## 現在の実装方針

### Cloudflare検出と自動待機

監視フローにCloudflare検出が組み込まれている。

```
スケジュール監視開始
  ↓
waitForScheduledWatchPageReady()
  ↓
detectCloudflareChallenge() で検出
  ↓
検出時 → handleCloudflareChallenge() で最大30秒待機
  ↓
自動解決後 → 監視継続
```

### テスト時のCloudflare強制表示

Cloudflare画面をテストしたい場合は、Chrome「閲覧履歴データを削除」で「Cookieと他のサイトデータ」を削除する。

---

## 更新履歴

| 日付 | 内容 |
|------|------|
| 2026-06-08 | cf_clearance削除機能を全削除。Chromeの閲覧履歴削除による方法を追記 |
| 2026-06-08 | 初版作成。bypassCacheの限界とタブ入替方式の検証結果を記録 |
