# ai-notes

## 現在の実行状況

- タスク名: EC監視自動反映セレクタ適合化
- 更新日: 2026-09-21
- 最後に更新したAI: Codex
- 状態: 実装・検証完了
- 現在フェーズ: Phase 2
- 次にやること: なし（完了処理へ移行）。

## 重要な知見

- Premium Bandaiの`div.cart`は在庫あり・在庫なし・予約終了の各キャプチャで1件、商品本体外一致0件。
- `button#buy:not([disabled])`は購入操作用として正しく、PageRecorderの継続監視主対象には使わない。
- Popupは`pageRecorderMonitor`を優先し、未設定サイトでは既存の`inStock` / `inStockText`を使うため、既存サイトの自動補完を変更しない。
- 2026-09-21: ユーザーがPremium Bandaiの予約終了ページで、セレクターエラー停止せず監視継続できることを手動確認し、合格と報告した。
