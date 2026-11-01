# 共有Chrome通知 手動確認

## 目的

系統Aの検知通知が共有 `ChromeNotify` を通り、通知失敗時にも監視・保存・Gmail・外部拡張通知の契約を停止させないことを確認する。

## 専用シナリオ

1. ChromeでPageRecorderの通知を許可し、Service Worker Consoleを開く。
2. popup のテストタブで「A: single」→「9. 共有Chrome通知を表示する」→「テスト開始（自動判定）」を押す。
3. 「在庫を検知」のOS通知が1回表示され、Consoleに `[chrome-notify] 通知作成成功` が出ることを確認する。
4. 通常監視タブ、ダウンロード、Gmail送信、外部拡張通知が発生しないことを確認する。

通知がOS設定で抑止される場合は、結果カードとConsoleログを確認し、Chrome／OSの通知許可状態を記録する。

## 遷移確認

- 出現・即座検知・消失をそれぞれ通常の系統A監視で実行し、検知時に「在庫を検知」が1回表示されることを確認する。
- 即座検知OFFでは初回状態に通知がなく、出現は `なし→あり`、消失は `あり→なし` のときだけ通知されることを確認する。
- Service Workerを再読み込み後も、`chrome.storage.local.singleMonitoringSessions` の `previousKeywordPresent` を基準に重複通知しないことを確認する。
