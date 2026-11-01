# design — detection decision normalization reimport

## 方針

| 項目         | 方針                                                                                                               |
| ------------ | ------------------------------------------------------------------------------------------------------------------ |
| 再実装基準   | `task/detection-decision-normalization` のコードではなく、現行 `main` の `src/background/background.js` を正とする |
| 判定モデル   | `hasKeyword` と `decision` を分離し、`decision` は4値固定にする                                                    |
| 集約ロジック | `evaluateSingleKeywordDetection()` ベースの複数要素集約を維持する                                                  |
| 互換性       | `found` が必要な箇所は互換フィールドとして残しうるが、意味は `decision` と `hasKeyword` から導出可能にする         |
| 保存契約     | 通常保存は `decision === "detected"` のみ、タイムアウト保存は `timeout_*` 理由で分離する                           |

## 対象経路

1. `checkKeywordChange()` による通常監視
2. `chrome.scripting.executeScript` を使う初回即時判定
3. タイムアウト時の最終状態保存

## 正規化ルール

- `detectMode` 解決は `appear | disappear` の2値に正規化する
- `pending` は `Content Script応答なし` `Content Script未準備` `ページ準備待ち` `Cloudflare待機` などの一時状態だけに使う
- `error` は `キーワード未設定` `セレクタ構文エラー` `一致要素なし` など停止優先状態に使う
- `hasKeyword` はページ上の現在状態、`decision` は監視結果としての判定を表す

## 非採用

- 単一要素だけを見る設計への変更
- 2件目要素を優先する設計への変更
- 旧ブランチの大差分をそのまま再取込する方式

## 実装前メモ

- 実装時は `tests/unit/background-functions.test.js` に純粋関数テストを追加する
- `tests/docs/README.md` には単一ページ監視の手動確認観点を追加する
- `task/detection-decision-normalization` の削除は、再実装完了・テスト通過・手動確認観点整理後に行う
