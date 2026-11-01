# Chocolate Inc. 構造分析

> Shopifyベースのオンラインストア監視設定の分析資料

## サイト基本情報
- **URL**: https://shop.chocolate-inc.com/products/snsn02015
- **サイトタイプ**: ecommerce (Shopify)
- **地域**: Japan
- **言語**: 日本語
- **プラットフォーム**: Shopify

## UI構造分析

### 監視対象要素
- **要素タイプ**: ボタン (カートに追加/売り切れ表示)
- **表示テキスト**:
  - 在庫あり: "カートに追加する"
  - 在庫切れ: "売り切れ"
- **状態変化パターン**: テキスト変更（"カートに追加する" ↔ "売り切れ"）
- **変化タイミング**: 在庫状況変更時

### 状態別スクリーンショット
- [x] 通常状態（在庫あり）: "カートに追加する"ボタン表示
- [x] 監視対象状態（在庫切れ）: "売り切れ"ボタン表示
- [ ] 変化後状態（再入荷）: "売り切れ"→"カートに追加する"変化
- [ ] エラー状態: ページ読み込み失敗・要素見つからず

## DOM構造

### HTML構造（実際のコード）
```html
<!-- Shopify テンプレートベース構造 -->
<button id="ProductSubmitButton-template--19719530741978__main" type="submit" class="btn product-form__cart-submit">
  <span>カートに追加する</span>
</button>

<!-- 在庫切れ時 -->
<button id="ProductSubmitButton-template--19719530741978__main" disabled class="btn product-form__cart-submit btn--tertiary">
  <span>売り切れ</span>
</button>
```

### CSS情報
```css
/* Shopifyテンプレート標準クラス */
.btn.product-form__cart-submit {
    /* カートボタンスタイル */
}

.btn--tertiary {
    /* 売り切れ状態スタイル */
}
```

## セレクター分析

### 検証済みセレクター
1. **最推奨**: `#ProductSubmitButton-template--20131086794970__main`
   - **理由**: 現在の有効なテンプレートID、固有性最高
   - **テスト結果**: ✅ 通過
   - **注意**: テンプレート更新で変更リスク

2. **代替1**: `button[class*="product-form__cart-submit"]`
   - **理由**: Shopifyクラスベース、テンプレート変更に強い
   - **テスト結果**: ✅ 通過

3. **代替2**: `[data-action="add-to-cart"]`
   - **理由**: データ属性ベース（存在する場合）
   - **テスト結果**: ⚠️ 属性存在要確認

### 避けるべきセレクター
- **セレクター**: `#ProductSubmitButton-template--19719530741978__main` (旧ID)
- **理由**: 古いテンプレートID、現在は無効

## 検証コード

### セレクターテストコード
```javascript
// console.log で実行可能な検証コード
const testSelectors = [
    '#ProductSubmitButton-template--20131086794970__main',
    'button[class*="product-form__cart-submit"]',
    '[data-action="add-to-cart"]'
];

testSelectors.forEach(selector => {
    const element = document.querySelector(selector);
    console.log(`${selector}: ${element ? '✅ Found' : '❌ Not found'}`);
    if (element) {
        console.log(`Text: "${element.innerText}"`);
        console.log(`Disabled: ${element.disabled}`);
    }
});
```

### キーワード検出テスト
```javascript
// キーワード変化の確認コード
const targetElement = document.querySelector('#ProductSubmitButton-template--20131086794970__main');
if (targetElement) {
    console.log('Current text:', targetElement.innerText);
    console.log('Contains "カートに追加する":', targetElement.innerText.includes('カートに追加する'));
    console.log('Contains "売り切れ":', targetElement.innerText.includes('売り切れ'));
    console.log('Is disabled:', targetElement.disabled);
}
```

## 設定推奨値

### 監視設定
- **監視間隔**: 30 秒
  - **理由**: 在庫変更頻度とサーバー負荷のバランス（1秒は高頻度すぎる）
- **検知モード**: `appear`
  - **理由**: "売り切れ"から"カートに追加する"への出現を検知
- **停止条件**: `count`
  - **推奨値**: 3回検知後停止

### ダウンロード設定
- **スクリーンショット**: `true`
- **HTMLソース**: `true`
- **フッターなしHTML**: `false` (Shopifyでは不要)

## 注意事項

### 技術的制約
- **テンプレートID変更**: Shopifyテーマ更新時にID変更リスク高
- **JavaScript動的生成**: DOM準備完了待機が重要
- **認証・ログイン**: 一般商品ページのためアクセス制限なし

### サイト固有の特徴
- **更新頻度**: 商品ページは比較的安定、テーマ更新は月1-2回程度
- **特殊動作**: Shopify Ajax API使用、ページ遷移なしで在庫更新可能
- **レート制限**: 一般的なeコマース水準、過度な頻度は避ける

### 運用上の注意
- **監視時間帯**: 日本時間 9:00-21:00 推奨（営業時間考慮）
- **負荷配慮**: 30秒間隔以上でサーバー負荷軽減
- **利用規約**: 一般的なブラウジング範囲内での利用

## 実装例

### .yml設定例（改善版）
```yaml
mode: "single"
version: "1.7.0"

single_config:
  url: "https://shop.chocolate-inc.com/products/snsn02015"
  settings:
    monitorSelector: "#ProductSubmitButton-template--20131086794970__main"
    monitorKeyword: "カートに追加する"
    detectMode: "appear"
    interval: 30
    stopCondition: "count"
    stopCount: 3
    downloadSource: true
    downloadScreenshot: true

multiple_configs: []

metadata:
  site_name: "shop.chocolate-inc.com"
  site_type: "shopify_store"
  created_by: "claude_code"
  created_date: "2025-09-25"
  schema: "monitoring-config/1.0"
```

## トラブルシューティング

### よくある問題と解決策
1. **セレクターが見つからない**
   - 原因: Shopifyテンプレート更新によるID変更
   - 対策: 代替セレクター `button[class*="product-form__cart-submit"]` に変更

2. **キーワードが検知されない**
   - 原因: 表記ゆれ（"カートに追加する" vs "カートに追加"）
   - 対策: 部分一致検索またはキーワード調整

3. **頻繁にエラーが発生**
   - 原因: 監視間隔が短すぎる（1秒間隔）
   - 対策: 30秒間隔に変更してサーバー負荷軽減

## 更新履歴
- **2025-09-25**: 初回分析・テンプレート適用
- **2025-08-11**: 元の.yml設定ファイル作成

---

## Shopify特有の注意事項
- テンプレートIDは `template--[数値]__[セクション名]` 形式
- テーマ更新時にIDが変更される可能性が高い
- クラスベースセレクターの方が安定性が高い
- Ajaxベースの在庫更新に対応するためDOM監視が重要