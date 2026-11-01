# Design

- 単一・複数URL監視の各セッションごとに、開始から終了までのテスト結果をメモリ上で収集する。
- AI判断サポートを有効にしたセッションは、終了時に1ファイルだけをダウンロードする。
- レポートには設定、工程別結果、判定結果、証跡の要求ファイル名・downloadId、関連ログのみを含める。
- 設定全体や他セッションのログ、外部拡張IDは出力しない。
- `detected`、`expired`、`selector_error`、`tab_missing` を終端理由として明示する。
- `resulttest` はレポート本文を再保存せず、終了理由・工程結果・証跡を本タスクの手動確認条件と照合する。
- 複数URL監視は既存の永続singleセッション基盤へ `monitoringScope: "multiple"` と開始リクエストの識別情報を渡す。出力名は `AI_Support_{requestId}_{configId}_{safeConfigName}_{site}_{outcome}_{timestamp}.md` とする。
- 共通UIはモード切替時に各モードの保存値を表示し、変更時は選択中モードだけへ保存する。
