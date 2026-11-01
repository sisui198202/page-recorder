# blockers — 新商品URL自動取得

## 現時点

致命的な blocker はなし。

## 実装前に確認が必要な点

- 対象サイトごとの `selectors.productLinks` が現行 DOM に合っているか
- 既存の URL 抽出ロジックで不足するサイトがあるか
- 受信側拡張の期待 payload と現行 payload にズレがないか
