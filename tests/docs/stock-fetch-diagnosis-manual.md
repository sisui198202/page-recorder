# 在庫取得方式診断 手動確認

## 事前準備

1. 拡張機能を再読み込みする。
2. popup の「テスト」タブを開き、「取得方式診断」サブタブを選ぶ。
3. 在庫状態を画面上で確認できる商品ページを用意する。

## アクティブタブ方式

1. 商品ページをアクティブにし、「任意ページを診断」で「アクティブタブ」を選ぶ。
2. 診断セレクタと在庫ありキーワードを入力する。ECサイトを選択した場合は既定値が専用入力に反映されるため、必要に応じて直接修正する。
3. 画面で確認した在庫状態を選んで実行する。

期待結果:

- Fetch/DOMの一致数、暫定判定、日本時間の判定日時が表示される。
- popupを閉じて開き直しても、直近の単件診断結果とDevTools調査メモの導線が復元される。
- Downloadsの `PageRecorder/stock-fetch-diagnosis/<run-id>/` に `fetch.html`、`outerHTML.html`、`comparison.json`、`README.md` が保存される。
- 実行前後で監視開始状態、監視条件、通知設定が変わらない。

## ECサイト一括方式

1. 「診断するECサイト」で1件選択する（日産は初期サンプル登録済み）。
2. 「在庫あり・なしをまとめて診断」を実行する。

期待結果:

- 在庫あり・なしごとのFetch/DOM成功数と、`FETCH_SUPPORTED`、`DOM_ONLY`、`NEEDS_REVIEW`のいずれかが表示される。
- Downloadsの同一run ID配下に状態・URL別の`fetch.html`、`outerHTML.html`、`comparison.json`、ルートの`summary.json`、解説用`判定結果の解説.md`、`summary.jsonの項目解説.md`、`README.md`が保存される。
- ECサイト未選択・複数選択・サンプル未登録では一括実行ボタンが無効で理由が表示される。

## 指定URL方式

1. 「任意ページを診断」で「商品ページURLを指定」を選び、診断対象URLを入力する。
2. 診断を実行する。

期待結果:

- 診断後に一時タブが残らない。
- 同一run IDの4成果物が保存される。

## API調査導線

`DOM_ONLY_CANDIDATE`、`NO_MATCH`、`FETCH_ERROR` のいずれかになった場合は、「DevTools調査メモを保存」を実行する。

期待結果:

- `api-investigation.md` が同じrun IDのフォルダに保存される。
- メモに対象URL、観測状態、セレクタ、キーワード、Network Fetch/XHRの確認手順が含まれる。
