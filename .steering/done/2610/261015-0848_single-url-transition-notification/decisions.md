# Decisions: 単独URL状態遷移検知と共有通知統合

## D-001: 遷移基準は既存の永続セッションに保存する

- 決定内容: `singleMonitoringSessions` にキーワード有無の基準状態を持たせる。
- 背景: 系統Aは高頻度・長期監視とも同じセッションを正本とし、Service Worker再開後も復元する。
- 検討した選択肢: Content Scriptのメモリだけに保存する案、別storageキーに保存する案、既存セッションへ追加する案。
- 採用理由: セッションと状態の寿命を一致させ、追加の照合や削除を不要にできる。
- 却下理由: Content Scriptメモリは再読込・Service Worker再開に耐えず、別キーは孤児状態を作る。
- 影響範囲: 系統Aの単独URL・複数URL、高頻度・長期監視。
- 関連: requirements.md、design.md、tasks.md。
- ステータス: 確定。

## D-002: 即座検知専用シナリオも共有通知を直接検証する

- 決定内容: シナリオ3の専用自動判定は、DOM一致を確認した直後に `showInventoryDetectionNotification()` を呼び、共有Chrome通知を必須確認項目に含める。
- 背景: シナリオ3は通常監視を起動しないため、検知・保存だけでは通知連携を確認できない。
- 採用理由: 本番と同じ共有通知ヘルパーを使い、通知失敗時も保存・終了確認を継続できる。
- 影響範囲: A: single のシナリオ3と、その結果カード・契約テスト。
- 関連: requirements.md、design.md、tasks.md、`tests/docs/shared-chrome-notification-manual.md`。
- ステータス: 確定。
