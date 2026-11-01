# decisions

- Gmail API 成功件数は、同一 `gmailTestRunId` 内の設定 ID を Set 相当で集計する。再試行や同一監視対象の重複通知を合格件数に含めない。
- 受信箱の到着・本文確認は Gmail 読取権限を増やさず、手動確認に留める。
