# CSSセレクタ仕様ガイド

**Summary AutoReload Downloader** - 監視対象セレクタ指定の完全リファレンス

作成日: 2025-10-01
対象バージョン: 1.8+

---

## 📋 目次

1. [概要](#概要)
2. [サポートされるセレクタパターン](#サポートされるセレクタパターン)
3. [属性セレクタ内の空白処理（CSS仕様）](#属性セレクタ内の空白処理css仕様)
4. [自動サニタイゼーション](#自動サニタイゼーション)
5. [無効なセレクタ](#無効なセレクタ)
6. [エラーメッセージとトラブルシューティング](#エラーメッセージとトラブルシューティング)
7. [ベストプラクティス](#ベストプラクティス)
8. [実際のテスト結果](#実際のテスト結果)

---

## 概要

この拡張機能では、**標準のCSS Selectors Level 3仕様**に準拠したセレクタを使用できます。
ブラウザの`document.querySelectorAll()`と同じセレクタが指定可能です。

### 基本原則
- ✅ **標準CSS仕様に準拠** - ブラウザコンソールで動作するセレクタは全て使用可能
- ✅ **自動サニタイゼーション** - 一般的なエラー（余分な引用符、改行等）は自動修正
- ✅ **明確なエラーメッセージ** - 構文エラー時は具体的な問題を表示
- ❌ **代替セレクタなし** - 指定されたセレクタのみを使用（自動フォールバックなし）

---

## サポートされるセレクタパターン

### ✅ 基本セレクタ

| パターン | 構文例 | 説明 |
|---------|--------|------|
| **要素セレクタ** | `div` | 要素名で選択 |
| **IDセレクタ** | `#add-to-cart` | ID属性で選択 |
| **クラスセレクタ** | `.c-button-cart` | class属性で選択 |
| **複数クラス** | `.btn.primary` | 複数クラスを持つ要素 |
| **全称セレクタ** | `*` | 全要素 |

### ✅ 属性セレクタ

| パターン | 構文例 | 説明 | 検証済みサイト |
|---------|--------|------|---------------|
| **完全一致** | `[id="add-to-cart"]` | 属性値が完全一致 | - |
| **部分一致** | `[id*="add-to-cart"]` | 属性値に含まれる | Sonny Angel |
| **前方一致** | `[id^="add-"]` | 属性値の先頭一致 | - |
| **後方一致** | `[id$="-cart"]` | 属性値の末尾一致 | - |
| **単語一致** | `[class~="button"]` | 空白区切りの単語一致 | - |
| **複数属性** | `[id*="cart"][class*="btn"]` | 複数条件の組み合わせ | Sonny Angel |

**実例（Sonny Angel Store）**:
```css
a[id*='add-to-cart'][class*='c-button-cart']
```
→ ID属性に"add-to-cart"を含み、かつclass属性に"c-button-cart"を含む`<a>`要素

### ✅ 結合子

| パターン | 構文例 | 説明 | 検証済みサイト |
|---------|--------|------|---------------|
| **子孫セレクタ** | `.container .button` | 子孫要素（空白） | - |
| **子セレクタ** | `.container > .button` | 直接の子要素 | Sonny Angel, POPMART |
| **隣接セレクタ** | `h1 + p` | 直後の兄弟要素 | - |
| **兄弟セレクタ** | `h1 ~ p` | 以降の兄弟要素 | - |

**実例（POPMART）**:
```css
.index_actionContainer__EqFYe > div[class*="index_btn__"]
```
→ `.index_actionContainer__EqFYe`の直接の子要素である`div`で、classに"index_btn__"を含むもの

### ✅ 疑似クラス

| パターン | 構文例 | 説明 |
|---------|--------|------|
| **nth-child** | `:nth-child(2)` | n番目の子要素 |
| **first-child** | `:first-child` | 最初の子要素 |
| **last-child** | `:last-child` | 最後の子要素 |
| **not** | `:not(.disabled)` | 条件に一致しない要素 |

### ✅ 複合セレクタ

```css
/* 【実証済み】属性部分一致 + 2段階の子セレクタ + ID（Sonny Angel Store） */
.c-buy > form[class*='go-to-cart'] > #add-to-cart-product-template

/* 要素 + 複数属性 + 疑似クラス */
button[type="submit"][data-action*="cart"]:not(.disabled)

/* 親子関係 + 複数条件 */
.product-details > .actions > button[class*="add-to-cart"]

/* 複雑な組み合わせ */
#product-form .buy-section > div[class*="button-container"] button:nth-child(2)
```

---

## 属性セレクタ内の空白処理（CSS仕様）

### 📖 CSS Selectors Level 3仕様

**重要**: 属性セレクタ内で**属性名と演算子の間の空白文字は無視されます**。

#### 等価なセレクタ例

以下は**すべて同じセレクタ**として解釈されます:

```css
[class*='value']    /* スペースなし（推奨） */
[class *='value']   /* スペース1つ */
[class  *='value']  /* スペース2つ */
[class   *='value'] /* スペース3つ */
```

#### 検証結果（2025-10-01）

**テスト環境**: Google Chrome + Summary AutoReload Downloader拡張機能
**テストサイト**: https://www.sonnyangelstore.com/products/flower-series-2019
**テストセレクタ**: `a[id*='add-to-cart'][class   *='c-button-cart']` （スペース3つ）

| テスト内容 | 結果 |
|-----------|------|
| ブラウザコンソールでの`querySelectorAll()` | ✅ 成功 - NodeList(2)を返す |
| Chrome拡張Content Scriptでの実行 | ✅ 成功 - 2個の要素を検知 |
| スペースなしバージョンとの比較 | ✅ 同一の結果 |
| 監視機能での動作 | ✅ 正常動作 |

**ログ出力例**:
```
🔍 [Content Script] セレクタ詳細分析:
  selectorOriginal: "a[id*='add-to-cart'][class   *='c-button-cart']"
  spaceCount: 3
✅ [Content Script] querySelectorAll成功: 2個の要素が見つかりました
```

#### 実用的な意味

- ✅ セレクタにスペースが含まれていても**エラーにならない**
- ✅ 意図しないスペースが入力されても**正常動作する**
- ✅ UIでスペースを自動削除する必要はない（CSS仕様で処理される）
- ⚠️ ただし、**可読性・保守性の観点からスペースなしを推奨**

---

## 自動サニタイゼーション

拡張機能は、一般的な入力ミスを**自動的に修正**します。

### 実装内容（popup.js）

```javascript
function sanitizeSelector(selector) {
    if (!selector || typeof selector !== 'string') {
        return selector;
    }

    let cleaned = selector.trim();
    cleaned = cleaned
        .replace(/"/g, '')      // ダブルクォート削除
        .replace(/'/g, "'")     // シングルクォート正規化
        .replace(/\n/g, '')     // 改行削除
        .replace(/\r/g, '')     // キャリッジリターン削除
        .replace(/\t/g, ' ')    // タブをスペースに変換
        .replace(/\s+/g, ' ')   // 連続スペースを1つに
        .trim();

    return cleaned;
}
```

### 自動修正される文字

| 文字 | 処理 | 理由 |
|------|------|------|
| **ダブルクォート (`"`)** | 削除 | CSS構文エラーの原因 |
| **改行 (`\n`)** | 削除 | 構文エラーの原因 |
| **キャリッジリターン (`\r`)** | 削除 | 構文エラーの原因 |
| **タブ (`\t`)** | スペースに変換 | 可読性向上 |
| **連続スペース** | 1つに統合 | 可読性向上 |
| **前後の空白** | 削除 | 余分な空白除去 |

### 実例

#### 例1: 余分なダブルクォート
```
入力: a[id*='add-to-cart'][class*='c-button-cart']"
     ↓ 自動サニタイゼーション
出力: a[id*='add-to-cart'][class*='c-button-cart']
```

**ログ出力**:
```
🧹 セレクタをクリーンアップしました:
  original: "a[id*='add-to-cart'][class*='c-button-cart']\""
  cleaned: "a[id*='add-to-cart'][class*='c-button-cart']"
  removedChars: {
    doubleQuotes: 1,
    newlines: 0,
    tabs: 0
  }
```

#### 例2: 改行とタブ
```
入力: .container
      > .button
     ↓ 自動サニタイゼーション
出力: .container > .button
```

---

## 無効なセレクタ

以下のパターンは**構文エラー**となり、監視が即座に停止します。

### ❌ 無効なパターン

| パターン | 例 | エラー内容 |
|---------|-----|----------|
| **不正な構文** | `[class*=value` | 閉じ括弧不足 |
| **無効な演算子** | `[class~*='value']` | 存在しない演算子 |
| **属性名内の空白** | `[class name*='value']` | 属性名が不正 |
| **無効な疑似クラス** | `:nth-child(abc)` | 引数が不正 |

### サニタイゼーションで修正不可能な例

```css
/* 閉じ括弧不足 */
.container > div[class*="button"

/* 無効な疑似要素 */
::fake-element

/* 完全に不正な構文 */
@#$%^&*
```

---

## エラーメッセージとトラブルシューティング

### エラー検出と表示

セレクタ構文エラーが発生すると、以下の情報が表示されます:

```
❌ [Content Script] querySelectorAll構文エラー:
  selector: "a[id*='add-to-cart'][class*='c-button-cart']\""
  errorName: "SyntaxError"
  errorMessage: "Failed to execute 'querySelectorAll' on 'Document': '[class*='button']\"' is not a valid selector."
  invalidChars: ["ダブルクォート(\")"]
  suggestion: "セレクタに不正な文字（ダブルクォート、改行、タブ等）が含まれていないか確認してください"
```

### よくあるエラーと対処法

#### エラー1: 要素が見つからない（elementCount: 0）

**症状**:
```
✅ [Content Script] querySelectorAll成功: 0個の要素が見つかりました
```

**原因**:
- セレクタは正しいが、ページ内に該当要素が存在しない
- SPAで要素が遅延ロードされている（POPMART等）
- セレクタの指定ミス

**対処法**:
1. **ブラウザコンソールで確認**:
   ```javascript
   document.querySelectorAll('あなたのセレクタ')
   ```
2. **要素のロードタイミング**: ページ読み込み完了後に要素が表示されるか確認
3. **セレクタの見直し**: Chrome DevToolsの要素検証でセレクタをコピー

#### エラー2: 構文エラー（SyntaxError）

**症状**:
```
❌ [Content Script] querySelectorAll構文エラー:
  errorName: "SyntaxError"
```

**原因**:
- 不正なセレクタ構文
- 自動サニタイゼーションで修正不可能な文字
- 括弧の不一致

**対処法**:
1. **ブラウザコンソールでテスト**:
   ```javascript
   document.querySelectorAll('テストセレクタ')
   ```
2. **段階的に簡略化**: 複雑なセレクタを分割してテスト
3. **エラーログの`invalidChars`を確認**: 不正な文字が検出されている場合は修正

#### エラー3: 監視が停止しない

**症状**: セレクタエラーなのに監視が継続

**原因**: 旧バージョン（v1.7以前）の動作

**対処法**:
- 拡張機能を最新版（v1.8+）に更新
- v1.8+では**セレクタエラー検出時に即座に停止**します

#### エラー4: バックスラッシュエスケープ問題

**症状**:
```
❌ セレクタ".index_actionContainer__EqFYe > div[class*=\\index_btn__\\]"に一致する要素が見つかりません
```
ログに`\\`（バックスラッシュ）が表示され、要素が検出されない

**原因**:
- **YAMLファイルからコピー時にエスケープ文字が混入**
- YAML形式: `monitorSelector: ".selector > div[class*=\"value\"]"`
- UI入力時: バックスラッシュ（`\"`）が不要な文字として混入

**具体例**:
```yaml
# YAMLファイル内の表記（正しい）
monitorSelector: ".index_actionContainer__EqFYe > div[class*=\"index_btn__\"]"

# これを直接コピーしてUI入力 → エラー発生
# 理由: バックスラッシュ（\）が不要な特殊文字として含まれる
```

**対処法**:
1. **UIで手動再入力**（推奨）
   ```
   ✅ 正: .index_actionContainer__EqFYe > div[class*="index_btn__"]
   ❌ 誤: .index_actionContainer__EqFYe > div[class*=\"index_btn__\"]
   ```

2. **YAMLからコピーする場合の注意**
   - ダブルクォート内の`\"`を`"`に置換
   - バックスラッシュを全て削除

3. **ブラウザコンソールで事前テスト**
   ```javascript
   // 正しいセレクタで要素が取得できるか確認
   document.querySelectorAll('.index_actionContainer__EqFYe > div[class*="index_btn__"]')
   ```

**根本原因**:
YAMLではダブルクォート内のダブルクォートを`\"`とエスケープする必要がありますが、**拡張機能のUI入力ではエスケープ不要**。sanitizeSelector関数がダブルクォートを削除するため、通常は問題になりませんが、**バックスラッシュは削除されない**ため、不正なセレクタとなります。

**実例（POPMART）**:
- ❌ エラー入力: `.index_actionContainer__EqFYe > div[class*=\"index_btn__\"]`
- ✅ 正しい入力: `.index_actionContainer__EqFYe > div[class*="index_btn__"]`
- 結果: 手動再入力後、消失検知成功・スクリーンショット保存完了

---

## ベストプラクティス

### 1. セレクタの優先順位

推奨度の高い順:

1. **ID属性** - 一意で高速
   ```css
   #add-to-cart-button
   ```

2. **複数の属性セレクタ** - 具体的で柔軟
   ```css
   button[id*="add-to-cart"][class*="primary"]
   ```

3. **クラス + 子セレクタ** - 構造を明示
   ```css
   .product-actions > button.add-to-cart
   ```

4. **複雑な子孫セレクタ** - 最終手段
   ```css
   #product .container .actions .buttons button:nth-child(2)
   ```

### 2. 堅牢なセレクタの書き方

#### ✅ 推奨

```css
/* 複数の属性で特定 */
button[type="submit"][data-action*="add-to-cart"]

/* 親要素との関係を明示 */
.product-form > .actions > button[class*="cart"]

/* 部分一致で柔軟に */
[id*="add-to-cart"]
```

#### ❌ 非推奨

```css
/* 単一クラスのみ（変更されやすい） */
.btn-primary

/* CSS Modules等の動的クラス（変更される） */
.Button_button__a3k2j

/* 深すぎる階層（脆弱） */
#main > div > div > div > section > div > button
```

### 3. セレクタのテスト手順

#### STEP 1: ブラウザコンソールで確認
```javascript
// 要素が取得できるか確認
const elements = document.querySelectorAll('あなたのセレクタ');
console.log(elements.length, elements);

// テキスト内容を確認
elements.forEach(el => console.log(el.innerText));
```

#### STEP 2: 複数要素がある場合の順序確認
```javascript
// 2つ目の要素を取得する場合（Sonny Angel Store等）
const elements = document.querySelectorAll('#add-to-cart-product-template');
console.log('1つ目:', elements[0]?.innerText);
console.log('2つ目:', elements[1]?.innerText);
```

#### STEP 3: 拡張機能でテスト
- 監視設定で実際に動作確認
- 実行ログでelementCountを確認
- キーワード検知が正常か確認

### 4. サイト別のセレクタ戦略

#### Shopifyサイト（Sonny Angel Store等）
- **特徴**: 同じIDの要素が複数存在する場合あり
- **推奨**: 親要素で絞り込む
  ```css
  .side-sticky #add-to-cart-product-template
  ```

#### SPAサイト（POPMART等）
- **特徴**: 要素が遅延ロード
- **推奨**: CSS Modulesのプレフィックスを活用
  ```css
  .index_actionContainer__EqFYe > div[class*="index_btn__"]
  ```

#### 一般的なECサイト
- **特徴**: 標準的なHTML構造
- **推奨**: data属性やtypeで特定
  ```css
  button[type="submit"][data-product-id]
  ```

### 5. 同じIDが複数存在する場合の対処法

#### 問題
Sonny Angel Storeのように、同じID（`#add-to-cart-product-template`）を持つボタンが複数存在する場合があります。

#### 解決策

**方法1: 親要素で絞り込む（推奨）**
```css
.c-buy > form[class*='go-to-cart'] > #add-to-cart-product-template
```
- ✅ **階層構造を明示** - DOM構造の変更に強い
- ✅ **動的クラス名に対応** - 部分一致（`*=`）で柔軟性確保
- ✅ **特定の要素を確実に取得** - 複数の条件で一意性を保証
- ✅ **実証済み** - Sonny Angel Storeで動作確認済み

**実例（Sonny Angel Store）**:
- **要素構造**:
  ```html
  <div class="c-buy">
    <form class="go-to-cart-form">
      <button id="add-to-cart-product-template">カートに入れる</button>
    </form>
  </div>
  ```
- **セレクタ**: `.c-buy > form[class*='go-to-cart'] > #add-to-cart-product-template`
- **結果**: ✅ 2段階の子セレクタで確実に特定

**方法2: 親コンテナで絞り込む**
```css
.side-sticky #add-to-cart-product-template
```
- ✅ **よりシンプル** - 記述量が少ない
- ⚠️ **クラス名変更リスク** - サイト更新で動作しなくなる可能性

**方法3: 複数属性で特定**
```css
#add-to-cart-product-template[class*='c-button-cart']
```
- ✅ **ID + クラスで二重チェック** - より具体的
- ⚠️ **複数要素がマッチする可能性** - 完全な一意性は保証されない

#### どの方法を選ぶべきか

| 状況 | 推奨方法 | 理由 |
|------|---------|------|
| **確実に特定したい** | 方法1（親要素絞り込み） | 階層構造で一意性確保 |
| **シンプルに書きたい** | 方法2（親コンテナ） | 記述が短く可読性が高い |
| **属性で判別可能** | 方法3（複数属性） | IDとクラスの組み合わせで特定 |

---

## 実際のテスト結果

### テスト1: 子セレクタ（`>`）の検証

**サイト**: Sonny Angel Store
**URL**: https://www.sonnyangelstore.com/products/flower-series-2019
**セレクタ**: `.container-flex__sub > #add-to-cart-product-template`
**結果**: ✅ 成功

**ログ抜粋**:
```
✅ [Content Script] querySelectorAll成功: 1個の要素が見つかりました
✅ [Content Script] キーワード「カートに入れる」を検知: text="カートに入れる"
```

### テスト2: 属性セレクタ（`[]`）の検証

**サイト**: Sonny Angel Store
**URL**: https://www.sonnyangelstore.com/products/flower-series-2019
**セレクタ**: `a[id*='add-to-cart'][class*='c-button-cart']`
**結果**: ✅ 成功

**ログ抜粋**:
```
✅ [Content Script] querySelectorAll成功: 2個の要素が見つかりました
✅ [Content Script] キーワード「カートに入れる」を検知
```

### テスト3: 属性セレクタ内の空白（CSS仕様）

**サイト**: Sonny Angel Store
**URL**: https://www.sonnyangelstore.com/products/flower-series-2019
**セレクタ**: `a[id*='add-to-cart'][class   *='c-button-cart']` （スペース3つ）
**結果**: ✅ 成功（CSS仕様により空白は無視される）

**ログ抜粋**:
```
🔍 [Content Script] セレクタ詳細分析:
  selectorOriginal: "a[id*='add-to-cart'][class   *='c-button-cart']"
  spaceCount: 3
✅ [Content Script] querySelectorAll成功: 2個の要素が見つかりました
```

### テスト4: 無効なセレクタ（エラー検証）

**サイト**: Sonny Angel Store
**URL**: https://www.sonnyangelstore.com/products/flower-series-2019
**セレクタ**: `.error-test-invalid-selector-xyz`（存在しない要素）
**結果**: ✅ 適切にエラー検出・監視停止

**ログ抜粋**:
```
✅ [Content Script] querySelectorAll成功: 0個の要素が見つかりました
⚠️ [Background] キーワード検知失敗: selector=".error-test-invalid-selector-xyz", keyword="カートに入れる"
❌ [Background] セレクタエラー検出 - 監視を停止します
```

### テスト5: 自動サニタイゼーション（余分なダブルクォート）

**サイト**: Sonny Angel Store
**URL**: https://www.sonnyangelstore.com/products/flower-series-2019
**セレクタ（入力）**: `a[id*='add-to-cart'][class*='c-button-cart']"` （末尾に余分な`"`）
**セレクタ（実行）**: `a[id*='add-to-cart'][class*='c-button-cart']` （自動修正）
**結果**: ✅ 成功（自動サニタイゼーションが正常動作）

**ログ抜粋**:
```
🧹 セレクタをクリーンアップしました:
  original: "a[id*='add-to-cart'][class*='c-button-cart']\""
  cleaned: "a[id*='add-to-cart'][class*='c-button-cart']"
  removedChars: { doubleQuotes: 1 }
✅ [Content Script] querySelectorAll成功: 2個の要素が見つかりました
✅ 監視完了
```

### テスト6: 子セレクタ + 属性セレクタ（POPMART）

**サイト**: POPMART
**URL**: https://www.popmart.com/jp/products/5737
**セレクタ**: `.index_actionContainer__EqFYe > div[class*="index_btn__"]`
**結果**: ✅ セレクタは正しい（要素カウント: 0 はSPAの遅延ロード原因）

**ログ抜粋**:
```
✅ [Content Script] querySelectorAll成功: 0個の要素が見つかりました
```

**注意**: 要素が見つからないのはセレクタの問題ではなく、SPAの特性（要素が遅延ロード）によるものです。

### テスト7: 複合パターン（属性部分一致 + 2段階子セレクタ + ID）

**サイト**: Sonny Angel Store
**URL**: https://www.sonnyangelstore.com/products/flower-series-2019
**セレクタ**: `.c-buy > form[class*='go-to-cart'] > #add-to-cart-product-template`
**結果**: ✅ 成功

**特徴**:
- **2段階の子セレクタ** - `.c-buy > form > #id` の3要素連鎖
- **中間要素に属性部分一致** - `form[class*='go-to-cart']`で動的クラス対応
- **最終的にIDで特定** - 同じIDを持つ複数要素から特定要素を絞り込み

**実用シーン**:
同じIDを持つ要素が複数存在する場合（Sonny Angel Storeでは`#add-to-cart-product-template`が2つ）に、親要素の階層構造で特定の要素を確実に絞り込む手法。

**構造イメージ**:
```
.c-buy (親コンテナ)
  └─> form[class*='go-to-cart'] (中間フォーム要素)
       └─> #add-to-cart-product-template (目的のボタン)
```

**ログ抜粋**:
```
✅ キーワード出現検知！ {keyword: 'カートに入れる'}
📸 スクリーンショット保存完了
📄 HTMLソース保存完了
🏁 監視処理完了 - 正常終了
```

**検証された新パターン**:
- ✅ 属性部分一致（`[class*='value']`）
- ✅ 2段階の子セレクタ連鎖（`parent > child > grandchild`）
- ✅ クラス + 属性 + ID の複合条件

### テスト8: POPMARTサイトでの検証（成功・エラーパターン）

**サイト**: POPMART
**URL**: https://www.popmart.com/jp/products/5737

#### ✅ 成功パターン

**セレクタ**: `.index_actionContainer__EqFYe > div[class*="index_btn__"]`
**結果**: ✅ 成功

**ブラウザコンソールテスト**:
```javascript
// テスト1: クォートあり
document.querySelectorAll('.index_actionContainer__EqFYe > div[class*="index_btn__"]')
// → NodeList [div.index_btn__w5nKF.index_black__RgEgP...]

// テスト2: クォートなし（sanitizeSelector後）
document.querySelectorAll('.index_actionContainer__EqFYe > div[class*=index_btn__]')
// → NodeList [div.index_btn__w5nKF.index_black__RgEgP...]
```

**実機テスト結果**:
```
✅ キーワード消失検知！ {
    mode: '消失検知',
    keyword: '再入荷を通知',
    actualText: '関西987',
    status: 'キーワード不存在確認（消失検知成功）'
}
📸 スクリーンショット保存完了
📄 HTMLソース保存完了
🏁 監視処理完了 - 正常終了
```

#### ❌ エラーパターン

**セレクタ（誤）**: `.index_actionContainer__EqFYe > div[class*=\"index_btn__\"]`
**結果**: ❌ 失敗

**エラーログ**:
```
❌ セレクタエラー検出 - 監視を停止します
error: 'セレクタ".index_actionContainer__EqFYe > div[class*=\\index_btn__\\]"に一致する要素が見つかりません'
selector: '.index_actionContainer__EqFYe > div[class*=\\index_btn__\\]'
```

**エラー原因**:
- **バックスラッシュエスケープ（`\"`）の混入**
- YAMLファイルからコピー時にエスケープ文字が含まれた
- ログ表示: `class*=\\index_btn__\\]` - 不正なエスケープ

**重要な注意**:
- ⚠️ **YAMLファイルのエスケープ表記はUI入力時に使用不可**
- ⚠️ **UI入力ではダブルクォートをそのまま入力**
- ⚠️ **バックスラッシュ（`\`）を含めないこと**

**正しい入力方法**:
```
✅ UI入力: .index_actionContainer__EqFYe > div[class*="index_btn__"]
❌ YAML表記をコピー: .index_actionContainer__EqFYe > div[class*=\"index_btn__\"]
```

**検出された要素**:
```html
<div class="index_btn__w5nKF index_black__RgEgP index_btnFull__F7k90 index_disabled__lrE6N">
```

**検証成果**:
- ✅ **CSS Modules対応** - 動的クラス名でも部分一致で安定検出
- ✅ **SPA対応** - 遅延ロード要素も待機後に正常検知
- ✅ **消失検知モード** - キーワードの不存在を正確に判定
- ✅ **クォート自動サニタイゼーション** - UI入力時のクォート削除後も正常動作
- ⚠️ **エスケープ文字混入に注意** - YAML表記の直接コピーは禁止

---

## 参考リソース

### 公式仕様
- [CSS Selectors Level 3 (W3C)](https://www.w3.org/TR/selectors-3/)
- [MDN: CSS Selectors](https://developer.mozilla.org/ja/docs/Web/CSS/CSS_Selectors)
- [MDN: document.querySelectorAll()](https://developer.mozilla.org/ja/docs/Web/API/Document/querySelectorAll)

### プロジェクト内関連ドキュメント
- `./sonnyangel-monitoring-config.yml` - Sonny Angel Store設定例（CSS仕様調査結果含む）
- `./chocolate-monitoring-config.yml` - Chocolate Inc.設定例
- `../サイト設定例集.md` - 一般的な設定例

---

## 変更履歴

| 日付 | バージョン | 変更内容 |
|------|----------|---------|
| 2025-10-01 | 1.0 | 初版作成。CSS仕様調査結果・サニタイゼーション実装・実際のテスト結果を統合 |
| 2025-10-01 | 1.1 | テスト7追加（複合パターン）・ベストプラクティス追加（同じID対処法）・複合セレクタ実例追加 |
| 2025-10-01 | 1.2 | テスト8追加（POPMART成功・エラーパターン）・エラー4追加（バックスラッシュエスケープ問題） |

---

## フィードバック

セレクタに関する質問・問題がある場合:
1. **ブラウザコンソールでテスト**: `document.querySelectorAll('セレクタ')`
2. **実行ログを確認**: Content Scriptのログ（監視対象タブのF12）
3. **Issue報告**: 具体的なサイトURL・セレクタ・ログを添えて報告
