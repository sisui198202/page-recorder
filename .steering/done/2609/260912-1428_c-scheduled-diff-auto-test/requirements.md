# requirements — c-scheduled-diff-auto-test

## 目的

テストタブから C 定時監視の URL 差分検知を安全に自動再現し、`newUrls` 検知までを自動判定できるようにする。

## 背景

現行の C 安全テストは、選択サイトへの接続と商品 URL の snapshot 取得のみを確認する。baseline との比較、URL 差分検知、停止までを実機操作や本番設定の変更なしで確認できる導線が必要である。

## 起点

- `plan/docs/c-scheduled-diff-auto-test.md`
- ユーザー提案: baseline から URL を1件除外して定時監視を開始し、`newUrls` を発生させるテストの自動化・自動判定

## 受け入れ条件

- [x] C サイト選択の横に、既存の商品取得テストとは独立した「差分検知テスト」を表示する。
- [x] 初回 snapshot から URL を1件だけ除外したテスト専用 baseline を作り、次の取得で既存の URL 差分関数による `newUrls` 検知を確認する。
- [x] 本番 baseline、通常 C 監視、ダウンロード、Chrome 通知、外部拡張通知を変更・実行しない。
- [x] 結果カードで URL取得、baseline作成、再取得、差分検知、Gmail 検知送信、終了を判定する。
- [x] Gmail 確認は既定 OFF で popup 再表示後も保持する。OFF 時は Gmail API・認証を呼ばない。
- [x] Gmail 確認 ON 時は既存の有効化・宛先・テストメール成功の事前確認を通過した場合だけ開始し、今回の実行 ID に一致する検知送信成功だけを成功とする。

## 承認

- [x] ユーザー提示計画を実装依頼として承認済み
