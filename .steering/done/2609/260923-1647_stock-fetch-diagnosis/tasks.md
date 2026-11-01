# タスク: 在庫取得方式診断

起点: `plan/todo.md` の「在庫取得方式診断を追加する」および `plan/docs/在庫取得方式診断改善計画.md`

## Phase 1: 診断データ契約とHTML解析

- [x] `offscreen/offscreen.js` に `OFFSCREEN_ANALYZE_STOCK_HTML` を追加し、Fetch HTMLとouterHTMLへ同じCSSセレクタを適用して、一致数・キーワード一致数・構文エラーを要約する。
- [x] backgroundのoffscreen生成理由へDOM解析用途を追加し、既存のBlob保存と単一offscreen文書の再利用を保つ。
- [x] 解析結果から5つの暫定判定コードを決定する純粋関数を追加する。
- [x] ユニットテストで双方一致、DOMのみ一致、条件未一致、無効セレクタ、空キーワードを確認する。

## Phase 2: Service Worker取得・成果物保存・API調査メモ

- [x] `diagnoseStockFetch` のbackgroundハンドラを追加し、アクティブタブまたは指定URLの一時タブからouterHTMLと最終URLを取得する。
- [x] 同ハンドラで最終URLをService WorkerからFetchし、HTTPメタデータとHTML本文を取得してoffscreen解析へ渡す。
- [x] run ID、比較JSON、Fetch HTML、outerHTML、AI分析用READMEを生成し、`PageRecorder/stock-fetch-diagnosis/<run-id>/` へ保存する。
- [x] `downloadStockApiInvestigationMemo` のbackgroundハンドラを追加し、Fetch/XHRの手動調査手順をMarkdownとして保存する。
- [x] 一時タブが成功・失敗ともに閉じ、アクティブタブを閉じず、Fetch失敗でも診断要約と証跡を返すことをユニットテストで確認する。

## Phase 3: popup診断UIと条件解決

- [x] 単一URL監視に、常時表示の「取得方式診断（Fetch / DOM / API調査）」を追加する。取得元、観測状態、実行、結果、調査メモの導線を配置する。
- [x] フォーム値、`pageRecorderMonitor`、既存 `inStock` / `inStockText` の順で監視条件を解決するpopup関数を追加する。
- [x] 実行中・成功・失敗のUI状態を実装し、取得URL、解決条件、Fetch/DOM比較要約、判定コード、次の調査行動を表示する。
- [x] popupの条件解決優先順、送信メッセージ、判定別の調査メモ導線をユニットテストで確認する。

## Phase 4: 自動回帰確認

- [x] `npm test` を実行し、既存の単一／複数／定時監視テストを含めて回帰がないことを確認する。
- [x] JSON・HTML・JavaScriptの構文確認と `git diff --check` を実行する。
- [x] テスト失敗があれば原因を切り分け、設計の範囲内で修正して再実行する。

## Phase 5: Chrome手動確認

- [x] アクティブタブ方式で診断し、比較要約と4成果物が同一run IDで保存されることを確認する。
- [x] 指定URL方式で診断し、一時タブが残らないことを確認する。
- [x] `DOM_ONLY_CANDIDATE`、`NO_MATCH`、`FETCH_ERROR` のいずれかをテストデータまたは対象ページで再現し、DevTools調査メモを保存できることを確認する。
- [x] 診断前後で既存の監視設定、監視実行状態、通知が変更されないことを確認する。

## Phase 6: ECサイト状態別一括診断

- [x] 日産の`site_capture`を読んで同梱サンプル設定を生成する同期スクリプトを追加する。
- [x] 単一選択、サンプル登録時だけ一括診断を実行でき、単件診断を詳細操作として維持するpopup UIを追加する。
- [x] 状態別サンプルを直列取得し、HTML・比較JSON・`summary.json`・READMEを一括runへ保存するbackground処理を追加する。
- [x] 同期、選択可否、最終判定のユニットテストを追加する。
- [x] Chromeで日産サンプルを一括診断し、状態別成果物と`summary.json`を確認する。
- [x] popup起動時の2秒Service Worker事前疎通テストを除去し、正当な起動待ちをエラー表示しないようにする。
- [x] 一括診断の最終サマリーをローカル保存し、popupを開き直しても判定を復元する。
- [x] 一括診断の4判定、確認できること、次のアクションを利用者向けガイドへ整理する。
- [x] 今後の一括診断で、`summary.json`とは別に解説用`diagnosis-commentary.md`を自動保存する。
- [x] 同時ダウンロード時に既定名でDownloads直下へ出力される不具合を修正し、指定パスをChrome Downloads APIへ直接渡す。
- [x] 判定解説を日本語ファイル名で保存し、`summary.json`の各項目値をコメント付きで読む解説ファイルも追加する。
- [x] popupに、一括診断と単件診断がそれぞれ参照する選択項目を明記する。
- [x] 一括診断の最終判定に判定日時を表示し、`summary.json`へも保存する。
- [x] 単件診断の結果とDevTools調査メモ導線をローカル保存し、popupを開き直しても復元する。
- [x] 単件診断の最終判定に判定日時を表示し、`comparison.json`とローカル保存結果へも保存する。
- [x] 診断run IDのフォルダー名日時を`Asia/Tokyo`固定へ変更し、単件・一括の保存先とUTCの`diagnosedAt`維持をユニットテストで確認する（2026-09-24）。

## スコープ外

- Network Fetch/XHRの自動収集、HAR取込、`debugger` 権限の追加は今回実装しない。必要になった場合は別タスク化する。
