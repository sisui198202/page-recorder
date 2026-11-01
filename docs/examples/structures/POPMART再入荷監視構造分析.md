# POPMART 構造分析

> フィギュア・コレクタブル商品の再入荷監視設定の分析資料

## サイト基本情報
- **URL**: https://www.popmart.com/jp/products/5737
- **サイトタイプ**: ecommerce (collectible_figures)
- **地域**: Japan
- **言語**: 日本語
- **プラットフォーム**: POPMART独自

## UI構造分析

### 監視対象要素
- **要素タイプ**: ボタン（再入荷通知/カートに追加ボタン）
- **表示テキスト**:
  - 在庫切れ: "再入荷を通知"
  - 在庫あり: "カートに追加"
- **状態変化パターン**: テキスト変更（"再入荷を通知" → "カートに追加"）
- **変化タイミング**: 再入荷時

### 状態別スクリーンショット
- [x] 通常状態（在庫切れ）: "再入荷を通知"ボタン表示
- [x] 監視対象状態（再入荷時）: "再入荷を通知"→"カートに追加"変化
- [ ] 変化後状態（在庫復活）: "カートに追加"ボタン表示
- [ ] エラー状態: ページ読み込み失敗・要素見つからず

## DOM構造

### HTML構造（実際のコード）
```html
<!-- POPMART独自構造 -->
<div class="index_actionContainer__EqFYe">
  <!-- 在庫切れ時：再入荷通知ボタン -->
  <div class="index_btn__w5nKF index_black__RgEgP index_btnFull__F7k90">
    <span class="index_btnText__yC81J">再入荷を通知</span>
  </div>

  <!-- 在庫あり時：カートに追加ボタン -->
  <div class="index_btn__w5nKF index_orange__jKd9S index_btnFull__F7k90">
    <span class="index_btnText__yC81J">カートに追加</span>
  </div>
</div>
```

### CSS情報
```css
/* POPMART CSSモジュール構造 */
.index_actionContainer__EqFYe {
    /* アクションボタンコンテナ */
}

.index_btn__w5nKF {
    /* ボタン基本スタイル */
}

.index_black__RgEgP {
    /* 再入荷通知ボタン（黒） */
}

.index_orange__jKd9S {
    /* カートに追加ボタン（オレンジ） */
}
```

## セレクター分析

### 検証済みセレクター
1. **最推奨**: `.index_actionContainer__EqFYe > div[class*="index_btn__"]`
   - **理由**: 直接子要素指定で精度向上、CSSモジュール変更耐性
   - **テスト結果**: ✅ 通過
   - **注意**: 部分一致で安定性を確保

2. **代替1**: `.index_btn__w5nKF.index_black__RgEgP`
   - **理由**: 再入荷通知ボタンの完全指定
   - **テスト結果**: ✅ 通過（在庫切れ時のみ）

3. **代替2**: `div[class*="index_actionContainer__"] > div[class*="index_btn__"]`
   - **理由**: CSSモジュールハッシュ変更への最大耐性
   - **テスト結果**: ✅ 通過

### 避けるべきセレクター
- **セレクター**: `.index_btnText__yC81J`
- **理由**: テキスト要素のみ、ボタン全体を捉えられない

## 検証コード

### セレクターテストコード
```javascript
// console.log で実行可能な検証コード
const testSelectors = [
    '.index_actionContainer__EqFYe > div[class*="index_btn__"]',
    '.index_btn__w5nKF.index_black__RgEgP',
    'div[class*="index_actionContainer__"] > div[class*="index_btn__"]'
];

testSelectors.forEach(selector => {
    const element = document.querySelector(selector);
    console.log(`${selector}: ${element ? '✅ Found' : '❌ Not found'}`);
    if (element) {
        console.log(`Text: "${element.innerText}"`);
        console.log(`Classes: ${element.className}`);
    }
});
```

### キーワード検出テスト
```javascript
// キーワード変化の確認コード
const targetElement = document.querySelector('.index_actionContainer__EqFYe > div[class*="index_btn__"]');
if (targetElement) {
    console.log('Current text:', targetElement.innerText);
    console.log('Contains "再入荷を通知":', targetElement.innerText.includes('再入荷を通知'));
    console.log('Contains "カートに追加":', targetElement.innerText.includes('カートに追加'));
    console.log('Button color class:', targetElement.className.includes('black') ? 'Black (Out of stock)' : 'Orange (In stock)');
}
```

## 設定推奨値

### 監視設定
- **監視間隔**: 30 秒
  - **理由**: フィギュア商品の再入荷頻度とサーバー負荷のバランス
- **検知モード**: `disappear`
  - **理由**: "再入荷を通知"テキストの消失（→"カートに追加"への変化）を検知
- **停止条件**: `count`
  - **推奨値**: 3回検知後停止

### ダウンロード設定
- **スクリーンショット**: `true`
- **HTMLソース**: `true`
- **フッターなしHTML**: `false` (POPMART独自構造のため不要)

## 注意事項

### 技術的制約
- **CSSモジュール**: POPMARTはCSSモジュールを使用、ハッシュ変更リスク有
- **JavaScript動的生成**: React/Vueベースと推定、DOM準備完了待機が重要
- **認証・ログイン**: 一般商品ページのためアクセス制限なし

### サイト固有の特徴
- **更新頻度**: フィギュア商品ページは頻繁更新、CSSモジュールは月1回程度
- **特殊動作**: SPA構造推定、Ajax通信での在庫状態更新
- **レート制限**: eコマース標準、高頻度アクセス注意

### 運用上の注意
- **監視時間帯**: 日本時間 10:00-22:00 推奨（フィギュア愛好家の活動時間考慮）
- **負荷配慮**: 30秒間隔以上で サーバー負荷軽減
- **利用規約**: 個人利用範囲内での監視利用

## 実装例

### .yml設定例（最適化版）
```yaml
mode: "single"
version: "1.7.0"

single_config:
  url: "https://www.popmart.com/jp/products/5737"
  settings:
    monitorSelector: ".index_actionContainer__EqFYe > div[class*=\"index_btn__\"]"
    monitorKeyword: "再入荷を通知"
    detectMode: "disappear"
    interval: 30
    stopCondition: "count"
    stopCount: 3
    downloadSource: true
    downloadScreenshot: true

multiple_configs: []

metadata:
  site_name: "www.popmart.com"
  site_type: "popmart_store"
  product_category: "collectible_figures"
  created_by: "claude_code"
  created_date: "2025-09-25"
  schema: "monitoring-config/1.0"
```

## トラブルシューティング

### よくある問題と解決策
1. **セレクターが見つからない**
   - 原因: CSSモジュールハッシュ更新による クラス名変更
   - 対策: 代替セレクター `div[class*="index_actionContainer__"] > div[class*="index_btn__"]` に変更

2. **キーワードが検知されない**
   - 原因: 表記ゆれ（"再入荷を通知" vs "再入荷通知"）
   - 対策: 部分一致検索またはキーワード調整

3. **頻繁にエラーが発生**
   - 原因: SPA構造でのDOM準備不完了
   - 対策: 監視間隔を30秒に調整、DOM完了待機実装

## 更新履歴
- **2025-09-25**: 初回分析・POPMART固有構造対応
- **2025-09-25**: セレクター最適化・CSSモジュール対応強化

---

## POPMART特有の注意事項
- CSSモジュールによる動的クラス名（`index_xxx__ハッシュ`形式）
- SPA構造推定によるDOM動的生成への対応必要
- フィギュア商品特有の高い再入荷需要に対する適切な監視頻度設定
- 直接子要素指定（`>`）による精度向上と安定性確保の重要性