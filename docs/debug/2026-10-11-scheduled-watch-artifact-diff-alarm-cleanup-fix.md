# デバッグ事例: 実運用再現の2回目アラームが発火しない

## 基本情報

- 日付: 2026-10-11
- 対象ファイル: `src/background/background.js`
- 問題タグ: #chrome-extension #alarms #scheduled-watch

## 症状

保存付き差分テストの`実運用再現`でbaseline保存後に`phase: detect`へ移行したが、次の専用アラームtickが発火せず、実行中のまま停止した。

## 原因

`runScheduledWatchTestTick`は`multi-artifact-diff`の専用runnerから戻った後も共通`finally`を実行し、再予約した専用アラームとテストsessionを削除していた。専用runnerを直接呼ぶユニットテストだけでは、この親tick側の後始末を検証できなかった。

## 修正

- `multi-artifact-diff`を親tickの共通後始末の対象外にした。
- 成功・失敗時のアラーム、タブ、sessionの後始末は既存どおり専用runnerへ任せた。
- 親tick経由でもbaseline後のアラームとsessionが残るユニットテストを追加した。

## 再現・確認手順

1. テストタブの保存付き差分テストで`実運用再現`を選ぶ。
2. baselineの3成果物保存後、`次の専用アラームtickでdetectフェーズへ移行`のログを確認する。
3. 次tickでdetect処理が始まり、検知2成果物とテスト終了が成功することを確認する。

## 学び

二段階の状態遷移では、専用runnerだけでなく、その呼び出し元の`finally`が途中sessionと再予約アラームを削除しないこともテストする。

## 確認結果

修正版をChromeで手動確認し、baseline保存後に別の専用アラームtickでdetectを開始し、検知PNG・HTML保存とテスト終了まで成功した。
