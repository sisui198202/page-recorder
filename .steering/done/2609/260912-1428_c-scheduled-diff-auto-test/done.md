# done — c-scheduled-diff-auto-test

## 完了内容

- C 選択サイトに対する専用の二段階差分検知テストを追加した。
- 一時 baseline、再取得、`newUrls`、任意の Gmail 検知送信を結果カードで判定する。
- 本番 baseline、通常 C 監視、ダウンロード、Chrome 通知、外部拡張通知は経由しない。

## 検証

- `npm test -- --runInBand` — 10 suites / 242 tests 成功
- Chrome 実機・Gmail 受信箱は手動確認待ち。手順: `tests/docs/c-scheduled-diff-auto-test.md`

## 追補

- 初回実機で確認中のまま停止する不具合を修正し、親tickが差分テストのアラーム・sessionを早期削除しない回帰テストを追加した。
- 初回DOM準備が8秒でタイムアウトする不具合を修正し、差分検知テストだけを最大30秒待機にした。
