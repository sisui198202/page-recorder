# ai-notes

## 現在の実行状況

- タスク名: 在庫取得方式診断
- 更新日: 2026-09-24
- 最後に更新したAI: Codex
- 状態: 完了処理中
- 現在フェーズ: 全Phase完了（task-close）
- 今回の主目的: Fetch HTMLとouterHTMLの比較による在庫取得方式の暫定診断
- 次にやること: commit・main反映後に`done.md`を作成し、`.steering/done/2609/`へ記録を移す

## 追加した知見

- offscreen文書でDOMParserを使うことで、Fetch HTMLをpopupへ返さずにCSSセレクタと要素テキストを比較できる。
- 2026-09-23: 日産の`site_capture`実データは在庫あり2件・在庫なし1件。同期スクリプトは計画上の件数を固定せず、状態別URLをすべて取り込む。
- 2026-09-24: popup起動時のService Worker事前疎通テストは2秒の固定タイムアウトで正常な起動待ちをエラー表示していた。実際の`getConfigManager`要求は30秒待機を持つため、冗長な事前テストを除去した。
- 2026-09-24: 一括診断の結果はpopupのDOMだけに描画していたため、popupを閉じると消えていた。HTMLを保存せず要約`summary`だけを`chrome.storage.local`へ保存し、再表示時に復元する。
- 手動確認: 2026-09-24、popupを開き直した後も一括診断の`FETCH_SUPPORTED`（在庫あり Fetch/DOM 2/2、在庫なし Fetch/DOM 1/1）が表示され続けることを確認。
- 2026-09-24: 一括診断の4判定と、判定別に確認できること・次のアクションを`docs/在庫Fetch診断_判定ガイド.md`へ整理した。
- 2026-09-24: 新規一括診断のrunには、機械処理用`summary.json`を変更せず、人向け解説の`diagnosis-commentary.md`を別途保存する。
- 2026-09-24: 同時ダウンロードでURLフラグメントとメモリ上の対応表による後付け命名が失敗し、`ダウンロード.*`がDownloads直下に二重出力された。Chrome Downloads APIの`filename`へ保存先を直接指定する方式へ変更した。
- 2026-09-24: 解説成果物は`判定結果の解説.md`へ日本語名で保存し、`summary.jsonの項目解説.md`では各JSON項目の実値と意味をコメント付きで確認できるようにした。
- 2026-09-24: popupには、一括診断がEC監視サイトでオンの単一サイトを使い、単件診断が監視対象のアクティブタブまたは指定URLを使うことを明記した。
- 2026-09-24: 一括診断の最終判定には日本時間の完了日時を表示し、同じ値を`summary.json`の`diagnosedAt`（UTC）へ保存する。
- 2026-09-24: 単件診断もpopupのメモリだけに結果を保持していたため、診断要約とDevTools調査メモ導線を`chrome.storage.local`へ保存し、再表示時に復元する。
- 2026-09-24: 単件診断にもUTCの`diagnosedAt`を保存し、popupでは一括診断と同じ日本時間形式で判定日時を表示する。既存の日時なし保存結果は日時行なしで復元する。
- 2026-09-24: run IDはUTCの`toISOString()`を使っていたため、Downloadsの作成時刻より9時間早いフォルダー名になっていた。run IDの日時部分だけを`Asia/Tokyo`固定へ変更し、`diagnosedAt`はUTC ISO 8601のまま維持する。
- 手動確認: 2026-09-24、単件診断結果はpopupを開き直しても復元されることを確認。日産商品URLで`body`と存在しないテスト用キーワードを使い`NO_MATCH`を再現し、`stock-fetch-20260924063450-mp5cwv/api-investigation.md`の保存内容（run ID、URL、状態、条件、DevTools Network手順）を確認。
- 手動確認: 2026-09-24、単件・一括診断の実行前後で既存の監視設定、監視の実行状態、通知設定・通知動作に変更がないことを確認。
- 手動確認: 2026-09-24、ユーザーが「在庫あり・なしをまとめて診断」と「Fetch / DOM を診断して保存」を実行し、Downloadsの`stock-fetch-20260924163443-...`と`stock-fetch-20260924163517-...`を確認した。フォルダー名の時刻はいずれもJSTの16時台で、JST化後の期待どおりだった。

## 手動テスト連携メモ

- 自動テスト: 2026-09-24、run IDのUTC→JST修正後に`npm test -- --runInBand --silent`が309件すべて成功。UTC `2026-09-24T07:24:00Z`からJST `20260924162400`のrun IDを生成すること、単件・一括の全ダウンロード先が各run ID配下となることを確認した。続けてユーザーがChrome Downloads上の単件・一括runフォルダー時刻がJSTであることを確認した。
- 自動テスト: 2026-09-24、`npm test -- --runInBand --silent` が307件すべて成功。一括診断の同期、選択可否、最終判定、2種類の解説Markdown出力、指定パスでのダウンロード、単件・一括診断のpopup再表示時の復元、およびService Worker事前疎通テストを実行しない回帰を含む。Chrome実機での取得・ダウンロード・一時タブ後始末は未確認。
- 手動確認: 2026-09-23、アクティブタブ方式で `stock-fetch-20260923080211-b8qtj7` を取得し、`fetch.html`、`outerHTML.html`、`comparison.json`、`README.md` の4成果物保存を確認。判定は `NO_MATCH`（Fetch HTTP 200、両HTMLでセレクタ1件・キーワード0件）。

## 参照優先順位

`requirements.md > design.md > tasks.md > ai-notes.md`
