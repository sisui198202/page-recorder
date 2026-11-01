# PageRecorder 検知改善取込計画書

## 概要

`task/detection-decision-normalization` ブランチの設計意図だけを、現在の `PageRecorder/main` に再取込するための計画書。
旧ブランチの大差分実装は再利用せず、現行 `src/background/background.js` の複数要素評価・保存契約・外部通知契約を維持したまま、単一ページ監視の判定語彙だけを正規化する。
本書は未着手の改善計画であり、実装着手時は既存計画書を更新したうえで `.steering/` の `requirements / design / tasks` を起票してから進める。

**更新日**: 2026-08-28

---

## 1. 現状認識

- `initialKeywordDetection` による初回即時判定と、その後の定期監視開始は既に実装済み
- Cloudflare 検知と待機処理も既に別機能として存在する
- 一方で、単一ページ監視の `found` は経路によって意味が揺れている
- `MutationObserver` 系には前回状態比較があるが、主系統のポーリング判定とは分離している
- `task/detection-decision-normalization` には参考にしたい設計意図があるが、現行 `main` と実装差分が大きく、そのまま cherry-pick / merge すると別改変まで混入する

---

## 2. この計画で扱う対象

- 単一ページ監視の判定結果モデル整理
- `pending` の限定導入
- `initialKeywordDetection` と基準化の役割整理
- 保存・通知を走らせる条件の明確化
- `task/detection-decision-normalization` の再実装方針を現行 `main` 基準で固定すること

扱わないもの:

- 一覧 URL 差分監視への横展開
- `AutoCartAgent` の自動遷移・自動実行処理
- `MutationObserver` 系と `executeScript` 系の統合
- 記録系導線の大規模な作り替え
- 旧ブランチ側で入っていた単一要素化や「2つ目要素優先」前提への変更
- 旧ブランチのコードの直接再利用（merge / cherry-pick / copy）

---

## 3. 導入方針

### 3.1 判定状態は4種類に限定する

- `detected`: 保存・通知対象
- `not_detected`: 条件不成立だが再試行可能
- `pending`: ページ準備待ちや Cloudflare などで未確定
- `error`: 設定ミスまたは実行不能

### 3.2 `pending` は限定的に使う

- `pending` にするのは、Cloudflare 検知中、Content Script 未準備、ページ準備待ちなどの一時的状態のみ
- セレクタ構文エラー、要素未取得が恒常的に続くケース、キーワード未設定は `error` のまま扱う
- 「対象要素未出現」は一律 `pending` にしない
- 動的ページの扱いは、サイト設定で待機要否を持つのを基本とし、実行時の `pending` や selector 未出現は補助材料として扱う

### 3.3 動的ページ判定は自動化済みとみなさない

- 「静的ページか動的ページか」は固定分類ではなく、`readyState=complete` 後も監視対象要素が遅延出現・差し替えされるかで判断する
- `dynamicContent` のような情報があっても、現時点では毎回待機への自動切替フラグとはみなさない
- 将来の実装候補としては、サイト設定による明示指定を基本に、実行時情報を補助に使うハイブリッド方式を想定する

### 3.4 `found` を内部利用から段階的に外す

- 内部では `hasKeyword` と `decision` を分離する
- `hasKeyword`: 現在そのページでキーワードが存在するか
- `decision`: 今回の監視結果として `detected / not_detected / pending / error` のどれか
- 外部連携 payload、storage schema、ファイル名生成契約は変更しない
- `found` が必要な箇所では互換フィールドとして残してもよいが、意味は `decision` と `hasKeyword` から一意に導出できる状態にする

### 3.5 現行 `main` 優先で再実装する

- 複数一致要素の集約は、現行 `evaluateSingleKeywordDetection()` の挙動を維持する
- 初回即時判定、通常監視、タイムアウト最終保存の3経路で同じ判定モデルを使う
- `pending` は保存なし継続、`error` は停止、通常保存は `decision === detected` に限定する
- タイムアウト最終保存は通常検知と別理由の証跡として扱い、`timeout_*` 理由を維持または拡張する

---

## 4. 実装ステップ

### Phase 1: 判定モデル整理

- `src/background/background.js` に判定正規化用の純粋関数群を追加する
- 単一ページ監視で返す結果を `{ hasKeyword, decision, reason, text, error }` 相当に整理する
- `detectMode` 解決、エラー分類、`hasKeyword -> decision` 変換、経路別正規化を純粋関数に寄せる
- `checkKeywordChange()` と `executeScript` 側の戻り値の意味を統一する

### Phase 2: `pending` の限定導入

- Cloudflare 検知中は `pending` を返し、未検知扱いにしない
- Content Script 未準備、ページ再読み込み直後などの一時状態も `pending` に寄せる
- `pending` 時は保存・通知を行わず、既存の再試行ループを継続する
- セレクタ構文エラー、キーワード未設定、恒常的な要素未取得は `error` に固定する

### Phase 3: 初回判定と基準化の整理

- `initialKeywordDetection=true` は「初回即時判定あり」の意味として維持する
- 初回不一致時の基準保存は現仕様に合わせて残す
- 初回一致時の即時保存終了と、初回不一致時の基準化後継続を文書上でも明確化する
- 毎周期のDOM準備完了待ちと、初回基準化のための待機は別概念として整理する
- 初回 `pending` は保存せず継続し、初回完了扱いにしない

### Phase 4: 保存・通知条件の明確化

- 保存・通知は `decision === detected` の場合のみ実行する
- `pending` と `not_detected` はログのみ、`error` は停止とエラーログを優先する
- タイムアウト時の最終保存は現行仕様を維持しつつ、理由を `reason` で明示する
- 外部通知 payload、storage schema、ファイル名生成契約は維持する

### Phase 5: 手動テスト観点の追加

- Cloudflare またはページ準備不足を `pending` として扱うケース
- Content Script 未準備から復帰して検知継続できるケース
- 初回即時判定あり/なしで挙動が従来通りであること
- セレクタエラーが `pending` に吸収されず停止すること

### Phase 6: 参照ブランチ整理

- `task/detection-decision-normalization` は実装前には削除しない
- 再実装完了、テスト通過、手動確認観点整理、参照不要確認の4条件を満たしたら削除する

---

## 5. 完了条件

- 単一ページ監視で `hasKeyword` と最終判定が分離されている
- `pending` が一時的状態に限定され、設定エラーを隠さない
- `initialKeywordDetection` の意味と初回基準化の関係が文書化されている
- 保存・通知・再試行・停止の条件が判定状態ごとに整理されている
- 現行 `main` の複数要素集約判定が維持されている
- `.steering/` に今回の再取込方針が固定されている

---

## 6. 次の接続先

- 実装する場合は、まず `.steering/` に requirements / design / tasks を起こす
- 手動テスト文書には `pending` ケースとエラーケースを追加する
- 一覧監視への波及は、単一ページ監視の安定後に別タスクで判断する
- 実装は `task/detection-decision-normalization` のコードを戻すのではなく、設計を参照して現行 `main` に再実装する
