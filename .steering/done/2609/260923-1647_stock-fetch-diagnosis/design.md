# 設計: 在庫取得方式診断

## 構成

`popup.html` / `popup.js` に単一URL監視用の常時表示の診断UIを追加する。診断本体は `background.js`、HTML解析は `offscreen/offscreen.js` が担当する。

既存の即座取得と同じ対象選択・一時タブ生成・`downloadWithFilename` を再利用する。診断は監視開始、設定保存、通知、定時アラームの経路を呼ばない。

## popup

- セクションは取得元、観測状態のselect、診断開始ボタン、結果領域、DevTools調査メモのダウンロードボタンで構成する。
- 診断開始時、フォームの未保存値を読み取り、`resolveDiagnosisCondition` でセレクタ／キーワードを解決する。両方未入力なら、読み込み済みECサイト定義からURL一致サイトの `pageRecorderMonitor`、次に `inStock[0]` / `inStockText[0]` を採用する。
- `diagnoseStockFetch` メッセージには `{ monitorType, targetUrl, tabId, observedState, selector, keyword }` を渡す。成功応答はHTML本文を含めず、判定日時を含む表示用の要約とダウンロード済みファイル名だけを返す。popupは判定日時を日本時間で表示する。
- `downloadStockApiInvestigationMemo` メッセージは直前の診断要約を渡し、Fetch/XHR確認手順を含むMarkdownをダウンロードする。

## background

- `handleDiagnoseStockFetchMessage` は対象タブを確定し、指定URLでは既存のページ準備待機後に最終URLとouterHTMLを取得する。作成した一時タブIDだけを `finally` で閉じる。
- 同じ最終URLをService Workerから `fetch` し、HTTP status、response URL、Content-Type、本文を取得する。Fetch失敗時もouterHTMLを取得できた場合は比較不能な診断結果と証跡を返す。
- offscreen文書を既存の単一インスタンスとして確保し、`OFFSCREEN_ANALYZE_STOCK_HTML` でFetch HTMLとouterHTMLの解析を依頼する。作成理由にはDOM解析用途を追加する。
- 解析結果、入力条件、観測状態、取得メタデータ、UTCの判定日時からrun IDと `comparison.json` を生成し、`downloadWithFilename` で4成果物を `PageRecorder/stock-fetch-diagnosis/<run-id>/` に保存する。
- run IDの日時部分は`Intl.DateTimeFormat`に`Asia/Tokyo`を明示して`YYYYMMDDHHmmss`形式で生成する。`diagnosedAt`はUTC ISO 8601のままとし、フォルダー名の利用者向け時刻と機械処理用日時を分離する。
- 判定は以下の優先順にする。
  1. セレクタ構文エラー: `INVALID_SELECTOR`
  2. Fetch失敗: `FETCH_ERROR`
  3. FetchとDOMの双方でセレクタ一致かつ要素内キーワード一致: `FETCH_COMPATIBLE_CANDIDATE`
  4. DOMだけで同条件が成立: `DOM_ONLY_CANDIDATE`
  5. それ以外: `NO_MATCH`

## offscreen解析

- `DOMParser` でFetch HTMLとouterHTMLを個別に解析し、各文書で `querySelectorAll(selector)` を実行する。
- 文書ごとに、セレクタ一致数、各一致要素の正規化済みtextContent中のキーワード有無、キーワード一致要素数を返す。空キーワードはキーワード条件を満たさないものとして扱い、全ページ監視の暗黙フォールバックは診断で使わない。
- HTML本文や要素全文はbackground・popupへ返さず、比較要約だけを応答する。

## 成果物とAPI調査

- `comparison.json` にはrun ID、取得日時、入力URL・最終URL、観測状態、解決元、セレクタ、キーワード、Fetchメタデータ、Fetch/DOM比較要約、判定コードを記録する。
- `README.md` には、在庫あり・なしを同条件で取得する手順、AI投入前にCookie・トークン・個人情報を除去する注意、判定コードの意味を記載する。
- API調査メモは、対象URL、run ID、観測状態、監視条件、DevTools NetworkでFetch/XHRを絞り、在庫状態を再現してHARを必要に応じて保存する手順を記載する。

## ECサイト一括診断

- `scripts/sync-stock-fetch-diagnosis-samples.js` はTarget配下の`site_capture/02_product_in_stock`、`03_product_out_of_stock`の`url.txt`を解析し、`ec-sites.json`のhostname patternで対応するサイトを決定する。初期同梱対象は日産だけとする。
- popupは`ecSiteEnabled`がちょうど1件で、同梱設定に同じsite IDのサンプルがある場合だけ一括ボタンを有効にする。既存の単件診断はdetails内の詳細操作として残す。
- backgroundはサンプルを直列で一時タブへ開き、FetchとDOMを既存offscreen解析へ渡す。`in_stock`はキーワード一致、`out_of_stock`は同じセレクタ内のキーワード不一致とセレクタ一致を期待する。
- 状態別・URL別にHTMLと比較JSONを保存し、全件の成功数と最終判定を`summary.json`へ保存する。同じ情報から、判定の意味・次のアクション・URL別結果を日本語で示す`判定結果の解説.md`と、各JSON項目の値と意味を対応付ける`summary.jsonの項目解説.md`を生成する。

## テスト方針

- backgroundのハンドラでアクティブタブ／一時タブ、Fetch成功・失敗、finallyでの一時タブ終了、成果物保存要求をモックで確認する。
- HTML解析で双方一致、DOMのみ一致、条件未一致、無効セレクタ、空キーワードを確認する。
- popupの条件解決でフォーム値優先、`pageRecorderMonitor` フォールバック、既存フォールバックを確認する。
- Chrome手動確認で、成果物保存、判定表示、DevTools調査メモ、既存監視に副作用がないことを確認する。
