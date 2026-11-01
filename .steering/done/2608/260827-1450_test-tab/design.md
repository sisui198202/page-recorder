# design — テストタブ

## ステータス

初稿。`requirements.md` 承認済み前提で、`tasks.md` 具体化前の設計レビュー待ち。

## 概要

popup に開発者向けの `テスト` タブを追加し、`single` 監視向けシナリオプリセット適用 UI として再設計する。
ユーザーは主要 5 シナリオから 1 つを選び、`monitoring_config.single_config` を一括上書きできる。
適用直前の `single` 設定は `monitoring_config.single_config_backup` に 1 世代だけ退避し、復元ボタンから戻せるようにする。

## 設計方針

- 既存の監視ロジックや background message を変えず、popup の HTML / JS に閉じた UI 追加を優先する
- `single` のみを対象にし、`multiple` と background public message 仕様は変えない
- `tests/docs/` の内容を popup に複製せず、プリセット適用後に読むべき入口案内だけを残す
- backup は 1 世代のみとし、複数世代履歴や破壊的診断操作は入れない

## 対応要件マッピング

| 要件 | 対応方法 |
| --- | --- |
| 1. `テスト` タブの対象ユーザーと役割を定義する | popup 上では開発者向けの `single` シナリオ適用タブとして実装する |
| 2. `単一監視` / `複数監視` との責務境界を整理する | `single_config` と backup だけを更新し、`multiple` 系設定は不変に保つ |
| 3. `tests/docs/` を正本とした導線設計の方針を固める | popup には README への短い案内だけを置き、詳細手順は複製しない |
| 4. popup 上で集約したい確認項目や補助情報の範囲を整理する | シナリオ選択、説明、適用対象サマリー、backup 復元、README 案内に限定する |

## 変更対象

### 修正対象

- `src/ui/popup.html`
- `src/ui/popup.js`
- `tests/docs/README.md`

### 変更なし

- `src/background/background.js`
- `src/content/content.js`
- `src/config/*.json`

## UI 構成

### 1. モード選択

既存の `mode-option` に `data-mode="test"` を追加し、表示モードを以下の3つにする。

- `single`
- `multiple`
- `test`

既存の `modeDescription` も3モード対応に拡張する。

### 2. 表示領域

新規に `#testModeUI` を追加し、既存の `#singleModeUI` / `#multipleModeUI` と同列で切り替える。

`#testModeUI` の中身は「手動テストハブ」として構成し、シナリオ詳細カードを中心に次を表示する。

1. `テストシナリオ`
2. `確認ゴール`
3. `前提条件`
4. `popup設定値`
5. `注意事項`
6. `DevToolsコード`
7. `手動再現コード`（シナリオ依存）
8. `期待結果`
9. `backup 状態`
10. `操作ボタン`
11. `手順案内`

### 3. single シナリオ適用

popup 上で選べるプリセットは次の 5 件で固定する。

- `appear`
- `disappear`
- `initial_detected`
- `initial_not_detected`
- `pending_error_check`

シナリオ選択時は preview のみ更新し、保存はしない。
`single に適用` 押下時にだけ backup 保存と `single_config` の全体上書きを実行する。

各シナリオ定義は説明付きメタデータへ拡張し、最低限以下を持つ。

- `id`
- `label`
- `title`
- `goal`
- `preconditions[]`
- `popupSettings`
- `cautions[]`
- `devtoolsLabel`
- `devtoolsCode`
- `extraDevtoolsLabel`
- `extraDevtoolsCode`
- `expectedResults[]`
- `config`

`disappear` は「在庫なしページで消失検知」ではなく、「売り切れ表示が消えることを確認する」趣旨で説明する。

### 4. backup 状態

backup は `monitoring_config.single_config_backup` に保存する。

- 保存内容は `single_config` の完全コピー
- `saved_at`
- `source_scenario_id`

backup が存在しない間は復元ボタンを disabled にする。
新しいシナリオ適用時は 1 世代だけ上書き保存する。

backup 状態の表示自体は詳細カード外に独立させ、現在保持している backup 情報を継続表示する。

### 5. 手順案内

`tests/docs/README.md` を入口として案内するが、popup 側では詳細手順を複製しない。
README と個別文書を正本とし、popup には「拡張リロード」「Service Worker Console を開く」など短い前提だけを置く。

### 6. 描画方針

既存の `renderTestScenarioPreview()` は詳細カード前提へ組み替え、用途別の描画関数へ分割する。

- ゴール描画
- 前提条件描画
- popup設定値描画
- 注意事項描画
- DevToolsコード描画
- 期待結果描画

コード表示は `textContent` ベースで行い、コピー用ボタンを置く。

- `DevToolsコードをコピー`
- `手動再現コードをコピー`（存在時のみ）

## 既存手動テスト設定の扱い

既存の以下2箇所は、今回の実装では削除しない。

- `#manualTestSettings`
- `#multiManualTestSettings`

今回の設計では次の扱いにする。

- 既存設定は動作互換のため残す
- テストタブ内から「単一監視 / 複数監視で使う補助設定がある」ことを案内する
- 実際の UI 移設や統合は別タスク候補として保留する

これにより、初回導入で既存の操作パスを壊さず、責務分離だけ先に進める。

## JS 制御方針

### モード切替

`getCurrentMode()` と `updateModeUI()` を `test` 対応に拡張する。

- `single` のとき `#singleModeUI` のみ表示
- `multiple` のとき `#multipleModeUI` のみ表示
- `test` のとき `#testModeUI` のみ表示

### 初期表示

既存保存値に `mode` が無い場合は従来通り `single` を既定値にする。
`test` は明示選択時のみ表示する。

### データ更新

新規 top-level キーは追加しないが、`monitoring_config` 配下には `single_config_backup` を追加する。
`test` タブの適用・復元は既存の `loadConfig` / `saveConfig` 経路で完結させる。
background への新規 message は追加しない。

## `tests/docs/README.md` の更新方針

README 側には、popup の `テスト` タブから `single` シナリオを適用できる前提を追記する。

- 5 シナリオの事前設定入口であること
- backup / 復元の位置づけ
- 詳細は個別手順が正本であること

## 非対象

- background の診断 API 追加
- Service Worker の内部状態ダンプ UI
- `multiple` 向けシナリオ適用
- 複数世代の履歴管理
- `tests/docs/` の大規模再編

## 確認観点

- `single` / `multiple` の既存切替が壊れない
- `test` 選択時に他2モードの設定 UI が表示されない
- 5 シナリオで `single` UI の主要項目が期待値に切り替わる
- 適用前の `single_config` が `single_config_backup` に 1 世代だけ保存される
- 復元ボタンで backup 内容が `single_config` に戻る
- `multiple` の設定値や一覧監視系データが変化しない
- `tests/docs/README.md` とテストタブの案内内容が矛盾しない

## 保留事項

- `テスト` タブを常時表示にするか、開発時のみ表示にするか
- `#manualTestSettings` / `#multiManualTestSettings` を将来どこまで移設するか
- ドキュメント案内を静的文言にするか、設定状態に応じて出し分けるか
