# AI Notes

## 現在の実行状況

- 状態: 完了（main反映は保留）
- 既存差分: 診断対象の専用サイト選択、同期生成済み診断サンプル、関連UI。
- 既知の失敗: 実機で日産を選ぶと、PageRecorder配布設定に `monitorProfiles` がないため一括診断が実行できない。
- 原因: shared正本には日産の `monitorProfiles` があるが、PageRecorderの `ec-sites.json` が未同期。
- 手動テスト: 2026-10-19、日産オンラインショップ（2件）の一括診断が実行され、監視設定未同期エラーの解消を確認した。結果は `NEEDS_REVIEW`（在庫あり Fetch 1/1、在庫なし Fetch 0/1・DOM 0/1）。
