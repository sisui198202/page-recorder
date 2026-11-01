# 設計: 在庫Fetch診断のサイト選択化

- `diagnosisSiteSelect` に診断設定の登録サイトを表示する。
- 選択したsite IDを `chrome.storage.local.diagnosisSiteId` に保存し、診断可否と実行対象の唯一の入力にする。
- 既存のECサイト補完・監視設定・監視開始停止は変更しない。
- 診断サンプルJSONは正本同期の生成物として扱い、手修正しない。
