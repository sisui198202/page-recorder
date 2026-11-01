# 要件: 在庫取得方式診断

## 目的

popupから指定した商品ページのFetch HTMLとouterHTMLを取得・比較し、既存の在庫監視条件がFetch HTMLでも利用できる可能性を暫定表示できるようにする。

## 背景

現行の監視条件は、手動調査またはChrome DevTools MCPで確認したDOMを基準としている。商品ページのFetch HTMLだけで在庫判定できるサイトを見極め、必要時には在庫API調査へ安全に進める導線が必要である。

## 起点

- `plan/todo.md` の「在庫取得方式診断を追加する」
- `plan/docs/在庫取得方式診断改善計画.md`
- `docs/在庫取得方式調査_HTML比較とAIスキル設計.md`

## 要件

- 単一URL監視画面に、常時表示の「取得方式診断（Fetch / DOM / API調査）」を置く。専用モードタブは追加しない。
- 診断対象は既存のアクティブタブまたは指定URLの一時タブとする。指定URLの一時タブは成功・失敗にかかわらず閉じる。
- 監視条件はフォーム値を最優先し、未入力時だけURL一致したECサイト定義の `pageRecorderMonitor`、次に既存の `inStock` / `inStockText` を使う。
- 利用者は診断前に観測状態を `在庫あり`、`在庫なし`、`不明` から選択できる。
- Service Worker Fetch HTMLとouterHTMLに同じ監視条件を適用し、取得状態・一致数・キーワード一致・暫定判定・判定日時を表示する。
- HTML本文、比較JSON、調査READMEを同一run IDでローカルダウンロードする。既存の監視設定・監視実行・通知は変更しない。
- Fetch HTMLのみで在庫判定可能との確定は行わない。単一状態の一致は候補とし、在庫あり・なし双方の成果物を使うAI分析を最終判断とする。
- Fetchが使えない候補では、手動DevToolsのNetwork Fetch/XHR調査へ案内する。`debugger` 権限追加やNetwork通信の自動収集は対象外とする。
- ECサイトを1件選択した場合は、同梱した状態別サンプルをすべて順番に比較し、在庫あり・なしの両方を満たす最終判定を表示する。サンプル未登録、未選択、複数選択時は実行しない。
- 一括診断では、状態・URL別のFetch HTML、outerHTML、比較JSONと、全体の`summary.json`、判定の解説用`判定結果の解説.md`、JSON項目の解説用`summary.jsonの項目解説.md`、READMEを同一run ID配下へ保存する。
- run IDのフォルダー名日時は端末設定に依存せず、常に`Asia/Tokyo`（JST）で表す。`diagnosedAt`は機械処理用のUTC ISO 8601を維持する。

## 受け入れ条件

- popupで取得元、観測状態、解決されたセレクタ／キーワード、比較要約、次の調査行動を確認できる。
- `FETCH_COMPATIBLE_CANDIDATE`、`DOM_ONLY_CANDIDATE`、`NO_MATCH`、`INVALID_SELECTOR`、`FETCH_ERROR` を区別して表示できる。
- 各診断で `fetch.html`、`outerHTML.html`、`comparison.json`、`README.md` が同一run IDで保存される。
- 指定URL方式は一時タブを残さず、アクティブタブ方式は既存タブを閉じない。
- `DOM_ONLY_CANDIDATE`、`NO_MATCH`、`FETCH_ERROR` でDevTools調査メモをダウンロードできる。
- 既存の単一／複数／定時監視の動作と保存済み設定を変更しない。
- 全サンプルのFetch/DOMが期待値どおりなら`FETCH_SUPPORTED`、DOMだけなら`DOM_ONLY`、不一致・取得失敗・条件不備なら`NEEDS_REVIEW`、未登録なら`SAMPLES_NOT_REGISTERED`となる。
