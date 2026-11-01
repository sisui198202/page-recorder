# Decisions

## D001: Service Worker 内の既存ログ基盤を再利用する

`background.js` は `bgLog*`、`monitoringConfigManager.js` は `mcmLogger` を使う。新しいログ基盤を追加せず、現在の popup ログレベル設定と時刻プレフィックスをそのまま適用できるためである。

## D002: ロガー初期化前と注入関数内の生 console は対象外とする

前者は保存済みログレベルを読めず、後者は対象ページの実行コンテキストで Service Worker の設定対象外となるためである。
