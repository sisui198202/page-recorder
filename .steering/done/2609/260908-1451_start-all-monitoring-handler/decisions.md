# decisions — start-all-monitoring-handler

## D-001: `startAllMonitoring` だけを抽出する

- 決定内容: 同一ファイル内の名前付き async handler に `startAllMonitoring` のみを抽出する。
- 背景: `startMonitoring` は大規模な状態管理を含むため、同時に変更すると回帰範囲が広がる。
- 検討した選択肢: `startAllMonitoring` のみ抽出 / 両 case を抽出 / 監視系統を統合。
- 採用理由: 既存の補助関数と Jest 基盤を活用し、公開契約を局所的に固定できる。
- 影響範囲: background message dispatch と複数 URL 監視開始の単体テスト。
- ステータス: 確定。
