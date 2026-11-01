# tasklist — detection decision normalization reimport

## Phase 1: 計画固定

- [x] `plan/docs/PageRecorder検知改善取込計画書.md` を現行 `main` 基準の再取込方針へ更新
- [x] `.steering/2608/260828-1322_detection-decision-normalization-reimport/` を起票
- [x] `requirements / design / tasks` で非採用範囲とブランチ削除条件を固定

## Phase 2: 判定正規化実装

- [x] `src/background/background.js` に判定正規化用の純粋関数を追加
  - `normalizeSingleKeywordDetectionResult()` (line 331)
  - `createTimeoutSingleKeywordDetectionResult()` (line 439)
- [x] `checkKeywordChange()` を `hasKeyword` / `decision` 返却へ整理 (lines 4059, 4071, 4078, 4117)
- [x] 初回即時判定を同じ判定モデルへ接続 (line 4927)
- [x] タイムアウト最終保存を同じ判定モデルへ接続 (lines 5655, 5684)

## Phase 3: 確認

- [x] `tests/unit/background-functions.test.js` に主要分岐テストを追加
- [x] `tests/docs/README.md` に手動確認観点を追記
- [x] 自動テスト実行
  - `2026-08-28` `npx jest tests/unit/background-functions.test.js --runInBand`
- [x] 手動テスト実行
  - `2026-08-28` popup の `テスト` タブでシナリオ1からシナリオ7まで完了

### 手動テスト方法

- 事前準備
  - `chrome://extensions` で PageRecorder をリロードする
  - PageRecorder の Service Worker Console を開く
  - popup の `テスト` タブを開き、`single` シナリオを適用できる状態にする
- ケース1: `Content Script未準備` / `Content Script応答なし` の `pending`
  - 対象ページで content script 未注入状態を作るか、リロード直後に監視開始する
  - Service Worker Console で `decision: pending` と `content_script_not_ready` または `content_script_no_response` を確認する
  - スクリーンショット保存、HTML保存、完了通知が走らず、次回チェックへ継続することを確認する
- ケース2: ページ準備待ち / Cloudflare の `pending`
  - ページ準備が遅い対象、または Cloudflare 待機が出る対象で監視開始する
  - `decision: pending` と `page_not_ready` または `cloudflare_pending` を確認する
  - 通常検知通知や基準保存に混入せず、復帰後の再チェックへ進むことを確認する
- ケース3: 初回即時判定の復帰
  - `initialKeywordDetection=true` の設定で開始し、初回は `pending` になる条件を作る
  - 初回 `pending` 時に `initialCheckCompleted` が進まず、状態復帰後の再判定で `detected` または `not_detected` に遷移することを確認する
- ケース4: `error` 停止
  - `キーワード未設定`、無効セレクタ、要素未一致の少なくとも1件を試す
  - `decision: error` と `keyword_missing` / `selector_syntax_error` / `element_not_found` のいずれかを確認する
  - 監視が停止し、`pending` 扱いで継続しないことを確認する
- ケース5: タイムアウト最終保存
  - 短い `duration` を設定して、通常検知させずに時間切れまで待つ
  - 最終保存の `reason` が `timeout_still_exists` / `timeout_not_found` / `timeout_pending` / `timeout_error` のいずれかで記録されることを確認する
  - 通常検知時の保存理由と混在しないことを確認する
- 記録方法
  - 実施日を `2026-08-28` 形式で残す
  - 各ケースごとに `OK` / `NG` / `未実施` を記録する
  - 見たログ、未確認事項、再現条件を `done.md` または本 `tasks.md` に追記する

## Phase 4: 後処理

- [x] `task/detection-decision-normalization` が参照不要になったことを確認
  - `2026-08-29` 実装コード・設定・README・運用スクリプトからの直接参照がないことを確認し、残存参照は `plan/docs/` と `.steering/` の履歴文書のみ
- [x] 参照不要ならブランチ削除
  - `2026-08-29` ローカルブランチ `task/detection-decision-normalization` を削除
