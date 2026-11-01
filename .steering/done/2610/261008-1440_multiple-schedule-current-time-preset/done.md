# Done: A/B 定時実行設定と現在時刻プリセット

## 完了日時

2026-10-09

## 対象タスク

単一URL A/B の予約操作統一、複数URL A の開始元分離、複数URL B の対象別予約・即時監視・AI判断サポート、および現在時刻プリセット。

## 作業ブランチ

`feature/multiple-schedule-current-time-preset`

## merge先

`main`

## commit hash

`87682e4`（実装・自動テスト・手動テスト記録）

## 変更概要

- 単一URL A の毎日開始予約、単一URL B の予約・即時監視、複数URL A の即時/予約分離を実装した。
- 複数URL B に対象別予約、即時監視、現在時刻プリセット、AI判断サポートダウンロードを追加した。
- BのAI判断サポートを一覧差分監視向けに表示し、終了時の結果判定と即時ログを是正した。
- 実行履歴の自動再描画時も、チェック履歴の手動開閉状態を維持するようにした。

## 確認結果

- Chrome手動確認で、BのAI判断サポートがAEON・7netの両方で正常にダウンロードされ、実行履歴・終了判定・ログが一致した。
- Chrome手動確認で、監視中に開いたチェック履歴が自動更新後も閉じないことを確認した。
- 関連unit 4スイート149件、`npm run check:plan-todo`、JavaScript構文チェック、`git diff --check` が成功した。

## 残課題

今回の変更とは無関係の既知失敗として、`tests/unit/scheduled-watch-diff-test.test.js` が `scheduledWatchTestSession.phase` 未保存により1件失敗する。対象テストファイルはmainから未変更であり、本タスクの実装・受け入れ条件には含めない。

## 削除したブランチ

main反映後に `feature/multiple-schedule-current-time-preset` を削除する。

## ルール更新提案

なし。自動再描画時の開閉状態維持はPopup実装固有の対応であり、既存のテスト・手動確認・task-close運用ルールで扱える。
