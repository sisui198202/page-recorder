# design.md

## 概要

保存付き差分テストのカードに、短縮検証と実運用再現を切り替える非永続のラジオ型セグメントを追加する。

## UI

- カード内に`短縮検証`（既定）と`実運用再現`の相互排他ラジオを置く。
- 各選択肢には、短縮検証は同一実行内で完了、実運用再現は次の専用アラームtickで検知することを説明する。
- 選択値はpopupを閉じると既定へ戻り、`chrome.storage`や設定ファイルへ保存しない。

## 実行方式

- popupは`startScheduledWatchArtifactDiffTest`メッセージに`executionMode: "fast" | "alarm"`を含める。未指定・無効値は`fast`として扱う。
- backgroundは実行方式をテストsessionへ保存する。
- `fast`は既存どおりbaseline後に1秒待機し、同一実行内でdetectフェーズまで完了する。
- `alarm`はbaseline完了後に`phase: "detect"`のsessionと途中結果を保存し、専用アラームを1秒後に再予約して処理を返す。次tickがdetectを実行し、成功／失敗時にアラーム・一時tab・sessionを後始末する。
- 方式にかかわらず、既存の強制差分、基準3件・検知2件の保存、本番C監視・本番baseline・通知経路への非干渉を維持する。

## 要件対応

| 要件 | 対応方法 |
| --- | --- |
| 方式選択 | popupのラジオ型セグメントと実行メッセージを追加する。 |
| 短縮検証 | `fast`を既定にして既存の直接detect経路を維持する。 |
| 実運用再現 | `alarm`でsession保存と次tickのアラーム再予約を行う。 |
| 非干渉 | 既存の専用session・専用アラーム・通知抑止を両方式で共有する。 |
| 回帰確認 | UI契約、background状態遷移、全ユニットテスト、Chrome手動確認を実施する。 |

## 変更対象

- `src/ui/popup.html`
- `src/ui/popup.js`
- `src/background/background.js`
- `tests/unit/scheduled-watch-diff-test.test.js`
- `tests/unit/scheduled-watch-ui-contract.test.js`
- `tests/docs/scheduled-stock-diff-detection-verification.md`

## 非変更対象

- 通常の`multi-diff`差分検知テスト
- 本番C監視と本番baseline
- 設定ファイルと永続storageスキーマ

## テスト方針

- `fast`で最終成功・5成果物・session削除を確認する。
- `alarm`でbaseline後の`detect`保存、2回目アラーム予約、次tickでの最終成功・session削除を確認する。
- popupの既定値、切替、メッセージ送信値を確認する。
- Chrome popupで両方式の結果カードと、通知・本番監視の非干渉を確認する。
