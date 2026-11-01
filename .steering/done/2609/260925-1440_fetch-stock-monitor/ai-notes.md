# ai-notes.md

## 目的

Claude / Codex などの AI が、今回タスクの進行状況・判断補助・実務知見を後から素早く再利用できるように残す。

---

## 現在の実行状況

- タスク名: fetch-stock-monitor
- 更新日: 2026-09-25
- 最後に更新したAI: Codex
- 状態: `実装・自動テスト完了、A系Fetchの部分Chrome手動確認済み`
- 現在フェーズ: Phase 6〜7（取得方式選択と統合確認）
- 今回の主目的: A単一URL・A複数URL・C定時複数サイトでFetch／リロード方式を選択可能にする
- 次にやること: 同一実行でのpopup履歴、Fetch検知時証跡、Fetch失敗フォールバック、C系Fetch／リロードを手動確認する

---

## 参照優先順位

1. `requirements.md`
2. `design.md`
3. `tasks.md`
4. `ai-notes.md`

- `ai-notes.md` だけで仕様を確定しない
- 判断の確定理由は `decisions.md`
- 完了結果の要約は `done.md`

---

## 先に見るもの

- requirements.md: Fetch監視追加の目的・受け入れ条件
- design.md: 実装方法・データ構造・分岐ロジック
- tasks.md: Phase別実装項目
- decisions.md: （未記録）
- blockers.md: （未発生）
- 関連 docs: PRD/functional-design.md, PRD/architecture.md
- 関連する過去タスク: なし

---

## 今回の非変更範囲

- 診断ロジック自体の判定精度変更
- Fetch失敗時のフォールバック無効化
- DOM再確認後まで通知を遅延する方式

---

## うまくいった実装パターン

- A系高頻度Fetchは監視タブのContent Scriptで同一URLを取得し、既存の短周期タイマーを維持する。
- C系FetchはService Worker＋offscreenのタブレス経路を継続する。
- Fetch検知では通知を先行し、PNG・HTML・AI判断サポート保存のためにだけタブを再読込する。

---

## うまくいかなかった実装パターン

- 診断結果からFetchを自動有効化する導線は、利用者が方式を明示選択できないため廃止した。

---

## 手動テスト連携メモ

- 自動テスト: `npm test -- --runInBand` が15スイート・328件成功。`node --check` と `git diff --check` も成功。
- 2026-09-25のA系高頻度Fetch手動確認では、Fetch 20秒設定で初回後の2回が実測20.0秒、未検知のまま時間満了した。AI判断サポートとService Workerログで一致を確認した。
- 実行履歴は対象ごとに直近1実行を `monitoringExecutionHistory` へ保存し、popupとAI判断サポートファイルで確認する。Fetchの間隔はチェック開始時刻同士の実測値を表示する。
- Fetchの実測間隔は、実行履歴へ追加した直後にService Workerログにも出力する。A系はContent ScriptのFetch結果受信後、C系はService WorkerのFetch完了後に同じ形式で記録する。
- Fetch監視経路の設計判断は `docs/Fetch監視経路の設計ガイド.md` に集約した。短周期をService Workerへ統一せず、周期制御・取得経路・取得後の監査処理を分けて保守する。

---

## 未解決事項

- なし。通知先行・証跡再読込の方針はユーザー選択済み。

---

## 次のAIへの注意点

- 診断は確認専用であり、取得方式はpopupのselectで変更する。
- A系高頻度FetchはContent Script、C系FetchはService Worker＋offscreenであり、経路を混同しないこと。
- background.jsは約9000行あるため、関連関数の位置を把握してから編集すること
