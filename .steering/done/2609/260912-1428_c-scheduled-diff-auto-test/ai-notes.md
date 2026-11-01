# ai-notes — c-scheduled-diff-auto-test

## 現在の実行状況

- タスク名: C 定時差分検知の自動テスト
- 更新日: 2026-09-12
- 最後に更新した AI: Codex
- 状態: 実装・自動検証完了
- 現在フェーズ: manual verification handoff
- 今回の主目的: テスト専用の一時 baseline による C の `newUrls` 自動判定を要件化する。
- 次にやること: Chrome 実機で Gmail OFF の未送信、Gmail ON の受信箱到着・本文を確認する。

## 追加した知見

- C 差分テストは既存の安全テスト session と専用アラームを利用し、初回・再取得を別 tick にすると本番 C セッションを作らずに `newUrls` を再現できる。
- Gmail は `notifyGmailForNewProductDetection` に実行IDを渡し、保存済みの同一ID結果を照合することで、過去の成功を誤判定しない。

## 手動テスト連携メモ

- 自動テストは `npm test -- --runInBand` で242件成功。Chrome 実機と Gmail 受信箱は未確認で、手順は `tests/docs/c-scheduled-diff-auto-test.md` に記録した。
- 2026-09-12: Chrome 実機で初回URL取得・一時baseline作成後に「確認中」のまま停止する報告を受領。親tickが次tick用アラームとsessionを削除していたため修正し、親tickが差分テストの後始末を行わない回帰テストを追加した。修正後のChrome実機再確認は未実施。
- 2026-09-12: AEON の初回ページ準備が既定8秒でタイムアウトする報告を受領。差分検知テストだけを最大30秒待機へ変更し、通常の安全テストには待機時間を波及させない回帰テストを追加した。修正後のChrome実機再確認は未実施。

## 先に見るもの

- requirements.md
- `plan/docs/c-scheduled-diff-auto-test.md`
- `src/background/background.js` の `startScheduledWatchTest` と C の tick 処理

## 今回の非変更範囲

- Gmail 通知タスクの未完了確認
- 本番 C の baseline・通常監視・サイト定義
