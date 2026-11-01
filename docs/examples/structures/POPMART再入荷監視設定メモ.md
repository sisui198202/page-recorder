```
¥# 全体流れ
¥# 個別
```

ーーーーーー

¥# 全体流れ

---
## 「カートに追加する」、「今すぐ購入」 の違い

- 「カートに追加する」: カートインページ遷移

- 「今すぐ購入」: カートインページ遷移省略し、住所指定ページ遷移

(参考)

商品ページ → カートインページ → 住所指定ページ → 決済ページ

---

<div style="page-break-before:always"></div>

## 商品ページから購入確定まで遷移(今すぐ購入)

[今すぐ購入]

![商品ページ_カート有_DIMOOWORLD_1]("~/Desktop/Buy/Target/popmartサイト_アプリ/img/商品ページから購入確定まで遷移_カートに追加する_今すぐ購入/商品ページ_カート有_DIMOOWORLD_1.png")

[レジに進む]

![住所指定ページ_2]("~/Desktop/Buy/Target/popmartサイト_アプリ/img/商品ページから購入確定まで遷移_カートに追加する_今すぐ購入/住所指定ページ_2.png")

[確認して支払う]

![決済ページ_3]("~/Desktop/Buy/Target/popmartサイト_アプリ/img/商品ページから購入確定まで遷移_カートに追加する_今すぐ購入/決済ページ_3.png")

---

<div style="page-break-before:always"></div>

## 商品ページから購入確定まで遷移(カートに追加する)

[カートに追加する]

![商品ページ_カート有_DIMOOWORLD_1]("~/Desktop/Buy/Target/popmartサイト_アプリ/img/商品ページから購入確定まで遷移_カートに追加する/商品ページ_カート有_DIMOOWORLD_1.png")

[すべてを選択] or [個別商品チェック]

![カートページ_在庫有り_2]("~/Desktop/Buy/Target/popmartサイト_アプリ/img/商品ページから購入確定まで遷移_カートに追加する/カートページ_在庫有り_2.png")

[レジに進む]

![住所指定ページ_3]("~/Desktop/Buy/Target/popmartサイト_アプリ/img/商品ページから購入確定まで遷移_カートに追加する/住所指定ページ_3.png")

[確認して支払う]

![決済ページ_4]("~/Desktop/Buy/Target/popmartサイト_アプリ/img/商品ページから購入確定まで遷移_カートに追加する/決済ページ_4.png")

---
<div style="page-break-before:always"></div>

¥# 全体流れ

ーーーーーー

<div style="page-break-before:always"></div>

¥# 個別

---
## 商品ページ\_カート無

![商品ページ_カート無_THE-MONSTERS-Big-into-Energy-シリーズ-ぬいぐるみペンダント.png]("~/Desktop/Buy/Target/popmartサイト_アプリ/img/商品ページ_カート無_THE-MONSTERS-Big-into-Energy-シリーズ-ぬいぐるみペンダント.png.png")

[再入荷を通知]

```html
<div class="index_actionContainer__EqFYe">
  <div class="index_btn__w5nKF index_black__RgEgP index_btnFull__F7k90">
    再入荷を通知
  </div>
</div>
```

https://www.popmart.com/jp/products/5737

---

<div style="page-break-before:always"></div>

## 商品ページ\_カート有

![商品ページ_カート有_DIMOOWORLD]("~/Desktop/Buy/Target/popmartサイト_アプリ/img/商品ページ_カート有_DIMOOWORLD.png")

[カートに追加する] or [今すぐ購入]

```html
<div class="index_actionContainer__EqFYe">
  <div class="index_euBtn__7NmZ6 index_black__RgEgP">カートに追加する</div>
  <div class="index_euBtn__7NmZ6 index_red__kx6Ql">今すぐ購入</div>
</div>
```

https://www.popmart.com/jp/products/4347/DIMOO-WORLD-%C3%97-DISNEY-Series-Storage-Bag-Blind-Box

---

<div style="page-break-before:always"></div>

## カートページ\_在庫切れ

![カートページ_在庫切れ]("~/Desktop/Buy/Target/popmartサイト_アプリ/img/カートページ_在庫切れ.png")

[購入手続きへ]

```html
<div class="largeShoppingCart_checkoutContainer__fMesa">
  <button
    type="button"
    class="ant-btn ant-btn-primary ant-btn-dangerous largeShoppingCart_checkout__uBvab"
  >
    購入手続きへ
  </button>
</div>
```

https://www.popmart.com/jp/largeShoppingCart

---

<div style="page-break-before:always"></div>

## カートページ\_在庫有り

![カートページ_在庫有り]("~/Desktop/Buy/Target/popmartサイト_アプリ/img/カートページ_在庫有り.png")

「すべてを選択」

```html
<div class="largeShoppingCart_checkboxContainer__wzqPB">
  <div class="largeShoppingCart_checkboxLeft__fTyMU">
    <div class="largeShoppingCart_checkbox__Z4J5s"></div>
    <div class="largeShoppingCart_selectText__HRlyN">すべてを選択</div>
  </div>
  <div class="largeShoppingCart_checkboxRight__aiLlv"></div>
</div>
```

「個別チェックボックス」

```html
<div class="product_checkboxContainer__cBYAz">
  <div class="product_checkbox__9Oa3B"></div>
</div>
```

[購入手続きへ]

```html
<div class="largeShoppingCart_checkoutContainer__fMesa">
  <button
    type="button"
    class="ant-btn ant-btn-primary ant-btn-dangerous largeShoppingCart_checkout__uBvab"
  >
    購入手続きへ
  </button>
</div>
```

https://www.popmart.com/jp/largeShoppingCart

---

<div style="page-break-before:always"></div>

## 住所指定ページ

![住所指定ページ]("~/Desktop/Buy/Target/popmartサイト_アプリ/img/住所指定ページ.png")

[レジに進む]

```html
<button
  type="button"
  class="ant-btn ant-btn-primary ant-btn-dangerous index_placeOrderBtn__E2dbt"
>
  レジに進む
</button>
```

https://www.popmart.com/jp/order-confirmation?source=cart

---

<div style="page-break-before:always"></div>

## 決済ページ

![決済ページ]("~/Desktop/Buy/Target/popmartサイト_アプリ/img/決済ページ.png")

[確認して支払う]

```html
<div class="checkoutForm_payBtnContainer__pjNZ0">
  <button
    type="submit"
    class="ant-btn ant-btn-primary ant-btn-dangerous checkoutForm_placeOrderBtn__oNjTc"
  >
    確認して支払う
  </button>
</div>
```

https://www.popmart.com/jp/checkout?type=normal

---

¥# 個別

ーーーーーー