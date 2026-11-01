# requirements — detection decision normalization reimport

## 背景

`task/detection-decision-normalization` には単一ページ監視の判定語彙を整理する意図があるが、現行 `main` とは実装差分が大きい。旧実装をそのまま戻すと、今回不要な構造変更まで混入する。

## 目的

- 現行 `main` を基準に、単一ページ監視の内部判定を `hasKeyword` と `decision` に分離する
- `decision` を `detected | not_detected | pending | error` の4値に固定する
- 既存の保存・通知・外部連携契約を壊さずに、判定条件だけを明確化する

## 機能要件

1. 通常監視の `checkKeywordChange()`、初回即時判定、タイムアウト最終保存の3経路で同じ判定モデルを使う
2. `pending` は一時状態のみに限定する
3. `error` は停止優先の状態に限定する
4. `decision === "detected"` のときだけ通常保存・通知を行う
5. 現行 `main` の複数要素集約判定は維持する
6. 外部 payload、storage schema、ファイル名生成契約は変更しない

## 非機能要件

- 旧ブランチを merge / cherry-pick しない
- 変更対象は単一ページ監視に限定し、一覧差分監視や AutoCartAgent 連携へ波及させない
- 参照元ブランチは実装完了確認までは保持する

## 受け入れ条件

- `appear` で `hasKeyword=true` が `detected` になる
- `disappear` で `hasKeyword=false` が `detected` になる
- `pending` と `error` が混同されない
- 初回一致、初回不一致、初回 `pending`、初回 `error` の分岐が文書上で説明できる
- タイムアウト最終保存が通常検知と別理由の証跡として扱われる
