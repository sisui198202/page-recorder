# tests/docs

`tests/docs/` は、定時在庫監視まわりの手動テスト文書への入口です。詳細手順は各文書を正本とし、この README では「どのケースでどの文書を最初に読むか」を整理します。

(参考)
~/Work/chromeExtensions/PageRecorder

## 文書一覧

- [scheduled-stock-diff-detection-verification.md](./scheduled-stock-diff-detection-verification.md)
  `newUrls` 検知、誤通知防止、外部拡張への payload 確認を含む正本手順です。
- [aeon-scheduled-stock-check-sw-manual.md](./aeon-scheduled-stock-check-sw-manual.md)
  AEON 一覧を使う Service Worker 手動テストの補足です。baseline 証跡、復元、トラブルシュートを確認するときに使います。
- [ベースライン時と検知時ダウンロードテスト方法.md](./ベースライン時と検知時ダウンロードテスト方法.md)
  Alfred `tes'` から入るときの最短導線です。Workflow 項目と正本手順の対応を確認できます。
- [excel-import-file-picker-manual-test.md](./excel-import-file-picker-manual-test.md)
  popup の「Excel取込」からファイル選択を起動し、取込・キャンセルを確認する手順です。
- [gmail-notification-manual-test.md](./gmail-notification-manual-test.md)
  Gmail OAuth、テストメール、A/B/C 検知、無効時、認証切れ時の確認手順です。
- [gmail-detection-notification-e2e-test.md](./gmail-detection-notification-e2e-test.md)
  シナリオ8: Gmail API 送信成功を自動判定し、受信箱到着を手動確認する E2E テストです。
- [c-scheduled-diff-auto-test.md](./c-scheduled-diff-auto-test.md)
  popup から C の一時 baseline 差分と、任意の Gmail 検知送信を確認する手順です。
- [system-a-two-tier-monitoring-manual.md](./system-a-two-tier-monitoring-manual.md)
  系統Aの高頻度セッション・長期監視について、監視継続、検知、期限、tab消失、Service Worker再起動復元を確認する受け入れ手順です。
- [multiple-scheduled-monitoring-manual.md](./multiple-scheduled-monitoring-manual.md)
  複数URL監視（A）の Popup 定時開始、予約状態、アラーム発火を確認する手順です。
- [test-hub-scenario-catalog.md](./test-hub-scenario-catalog.md)
  popup のテストハブにある系統Aの受け入れ確認と、本番経路で動く A: single / A: multiple シナリオの一覧です。
- [テストタブ本番経路シナリオの手動テスト.md](./テストタブ本番経路シナリオの手動テスト.md)
  テストタブのシナリオが本番と同じ二層セッションで動き、自動で判定されることを Chrome で確認する手順です。
- [../fake-ec/README.md](../fake-ec/README.md)
  実在ECサイトへ接続せずにテストタブを確認する、localhost の偽セブンネット商品ページの起動・利用手順です。
- [stock-fetch-diagnosis-manual.md](./stock-fetch-diagnosis-manual.md)
  テストタブの「取得方式診断」で、一括・単件診断と API 調査メモを確認する手順です。

## 最初に読む文書

- `newUrls` 検知や payload 確認まで含めてタスク完了確認をしたい
  [scheduled-stock-diff-detection-verification.md](./scheduled-stock-diff-detection-verification.md) から開始します。
- AEON の Service Worker 操作、baseline 証跡、復元手順、トラブル時の切り分けを見たい
  [aeon-scheduled-stock-check-sw-manual.md](./aeon-scheduled-stock-check-sw-manual.md) を先に読みます。
- Alfred `tes'` から必要な項目だけ素早く実行したい
  [ベースライン時と検知時ダウンロードテスト方法.md](./ベースライン時と検知時ダウンロードテスト方法.md) を入口にします。
- Gmail 通知の認証または検知メールを確認したい
  [gmail-notification-manual-test.md](./gmail-notification-manual-test.md) を先に読みます。
- C の URL 差分検知を本番 baseline に触れず確認したい
  [c-scheduled-diff-auto-test.md](./c-scheduled-diff-auto-test.md) を先に読みます。
- 系統Aの高頻度または長期監視を確認したい
  [system-a-two-tier-monitoring-manual.md](./system-a-two-tier-monitoring-manual.md) を先に読みます。
- 複数URL監視を毎日指定時刻に自動開始する設定を確認したい
  [multiple-scheduled-monitoring-manual.md](./multiple-scheduled-monitoring-manual.md) を先に読みます。
- Fetch HTML と表示後 DOM の比較、または保存される診断成果物を確認したい
  [stock-fetch-diagnosis-manual.md](./stock-fetch-diagnosis-manual.md) を先に読みます。

## 実施前の共通前提

- `chrome://extensions` で PageRecorder をリロードしてから開始する
- PageRecorder の Service Worker Console を開いておく
- 必要に応じて `scripts/set-test-times.js` や Alfred Workflow を使い、実行時刻や対象設定をテスト用に合わせる

## popup `テスト` タブの使い方

- popup の `テスト` タブでは、`single / multiple` のサブ切替でシナリオ種別を選べます。シナリオの一覧と期待結果は [test-hub-scenario-catalog.md](./test-hub-scenario-catalog.md)、Chrome での確認手順は [テストタブ本番経路シナリオの手動テスト.md](./テストタブ本番経路シナリオの手動テスト.md) を正本にします
- A: single / A: multiple のシナリオは、本番と同じ二層セッション（高頻度・間隔5秒・時間60秒）で監視を開始し、終了理由（検知・時間満了・セレクタエラー）を期待結果と照合して自動で判定します。テスト用の短い間隔・時間や、テスト専用の旧 `setInterval` 経路は使いません
- `テストサイト` は既存設定（`ec-sites.json` の監視条件と `stock-fetch-diagnosis-sites.json` の在庫ありサンプル）から選びます。既定は日産オンラインショップで、選択は popup のローカル保存領域に保持されます。在庫なしで始めるシナリオは、在庫なしサンプルがあるサイトだけで実行できます
- `検知の再現` は「自動」（基準取得後に拡張が対象要素の文言を変える）と「手動」（基準取得後の最初の読み込みで20秒の受付時間を設け、DevTools でコードを実行する）を切り替えられます。手動の受付時間中は、Service Worker Console に `🧪 [対象名] 手動変更の受付時間中です（残り◯秒）` が出ます
- 開始前に本番の監視設定（`monitoring_config` と Gmail 通知設定）を退避し、終了時に復元します。結果欄には、サイト・シナリオ・各タブの期待と結果・失敗理由が表示されます。実行中は `テストを停止` で止められます
- 監視を開始しないシナリオ（single 5 空キーワード、single 9 共有Chrome通知）は、従来どおり結果カードで確認します。空キーワードは popup の開始前バリデーションで拒否されれば合格で、共有Chrome通知は通常監視を開始せずに「在庫を検知」の通知が1回表示されれば合格です
- 結果カードの完了通知が `完了通知: 送信済み` なら、Chrome が通知センターへの登録を確認できています。`許可されていない` または `確認できない` なら、Chrome のサイト設定ではなく **拡張機能の通知許可**、macOS の「システム設定 > 通知 > Google Chrome」、集中モードを順に確認してください
- 判定語彙正規化タスクの確認観点（`pending` と `error` の扱い）は、本番経路の判定でも変わりません。`Content Script未準備` `Content Script応答なし`、ページ準備待ち、Cloudflare 待機は `pending`、`キーワード未設定` `セレクタ構文エラー` `一致要素なし` は `error` として停止を優先します
- 詳細手順の正本は引き続き `tests/docs/README.md` と各個別文書です。popup 側は手動テストのハブですが、手順本文そのものは持ちません

## 更新ルール

- 手動テスト文書を追加したら、この README の索引も更新します
- 詳細手順は個別文書に置き、この README には導線と役割だけを残します
