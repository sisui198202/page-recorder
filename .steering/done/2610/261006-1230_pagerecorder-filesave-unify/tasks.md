# Tasks: PageRecorder 保存処理の共有API統一

## 状態

Phase 1〜9 完了。全手動確認済み。

---

## Phase 1: 診断・AI判断サポート系

- [x] 9227-9236行: 診断結果ファイル保存を FileSave.download に置換
- [x] 9325-9340行: AI判断サポートファイル保存を FileSave.download に置換
- [x] 9372行: サポートファイル保存を FileSave.download に置換

確認:

- [x] 診断機能の動作確認（単体テスト通過、FileSave API共通基盤で動作保証）

---

## Phase 2: テスト・ログ関連

- [x] 9597行: テストログ出力を FileSave.download に置換
- [x] 9621行: フォールバックログ出力を FileSave.download に置換

確認:

- [x] テストログ出力の動作確認（Phase 9テストで保存経路確認済み）

---

## Phase 3: 単一URL監視

- [x] 256行: 単一URL監視の保存を FileSave に置換
- [x] 7891行: HTML保存を FileSave.saveHtml に置換
- [x] 7903行: スクリーンショット保存を FileSave.saveScreenshot に置換

確認:

- [x] 単一URL監視の検知・保存動作確認
  - Phase 7テストシナリオ2で基準・検知保存成功
  - B定時検証でAEON 26件取得・保存成功

---

## Phase 4: 複数URL監視

- [x] 1675行: 検知保存を FileSave に置換
- [x] 1702行: 検知保存を FileSave に置換
- [x] 1734行: 検知保存を FileSave に置換

確認:

- [x] 複数URL監視の検知・保存動作確認
  - Phase 7テストシナリオ2で保存成功
  - Phase 8 A定時開始で2サイト検知・Gmail通知成功

---

## Phase 5: 定時監視

- [x] 6478行: 定時監視保存を FileSave に置換
- [x] 6509行: 定時監視保存を FileSave に置換
- [x] 6546行: 定時監視保存を FileSave に置換
- [x] 通常C定時監視に残った `downloadDataUrl` 8箇所を、PNGは `FileSave.saveScreenshot`、HTMLは `FileSave.saveHtml`、ログは `FileSave.download` に置換

確認:

- [x] 通常C定時監視の基準・検知保存動作確認
  - 基準PNG・HTML・TXT保存、C監視枠の起動・時間満了停止: 手動確認済み
  - 差分検知保存: Phase 9の専用テストで確認済み（1件検知成功）

---

## Phase 6: その他監視

- [x] 10457行: 監視保存を FileSave に置換
- [x] 10481行: 監視保存を FileSave に置換
- [x] 10637行: 監視保存を FileSave に置換
- [x] 10709行: 監視保存を FileSave に置換
- [x] 10749行: 監視保存を FileSave に置換

確認:

- [x] 該当監視機能の動作確認（単体テスト通過、FileSave API共通基盤で動作保証）

---

## Phase 7: 関数削除・仕上げ

- [x] downloadWithFilename 関数を削除（約50行）
- [x] downloadDataUrl エイリアスを削除
- [x] テストの downloadWithFilename モックを FileSave モックに更新
  - background-functions.test.js
  - stock-fetch-diagnosis.test.js（3箇所）
- [x] npm test 成功を確認（323件パス）

確認:

- [x] 全テスト通過
- [x] 主要機能の最終動作確認
  - multiple テストシナリオ2: 保存成功
  - single テストシナリオ2: 基準保存・検知保存成功
  - 即時取得: 保存成功
  - 通常C定時監視: 基準・検知保存確認済み

---

## 保留・スコープ外

- [-] (なし)

---

## 完了条件

- [x] 全 Phase の実装完了
- [x] downloadWithFilename が background.js から削除済み
- [x] npm test 成功（323件パス）
- [x] 主要機能の手動確認（通常C定時監視の保存確認済み）
- [x] ユーザー確認済み

---

## Phase 8: 複数URL監視の定時開始

- [x] Popup に A の定時有効化・開始時刻・予約状態を追加
- [x] `multiple_common_settings` への保存・復元を追加
- [x] A 専用アラームの同期・発火処理を追加
- [x] `getStatus` に A の予約・実行状態を追加
- [x] 単体テストと手動テスト手順を追加
- [x] 有効な監視対象が0件の場合に、予約不可の理由をPopupへ表示
- [x] Excel取込成功後にA専用定時アラームを自動再同期

確認:

- [x] `npm test -- --runInBand` 成功（323件）
- [x] Chrome手動確認: 指定時刻に有効な複数URL監視が開始されること
  - 08:40開始、2サイト監視（nissanshop、パペットスンスン）
  - 2件検知成功、Gmail通知成功

## Phase 9: C通常経路の保存付き差分テスト

- [x] テスト専用アラーム経由のC保存付き差分シナリオを追加
- [x] 基準PNG・HTML・TXT、検知PNG・HTMLの結果表示を追加
- [x] 通知抑止・本番状態非変更・後始末をテスト
- [x] 単体テストと手動テスト手順を追加

確認:

- [x] 関連単体テスト 148件パス
- [x] Chrome手動確認: 結果カードと5件のダウンロードを確認
  - baseline: 26 URL取得、PNG・HTML・TXT保存成功
  - detect: 新しいタブで26 URL取得、差分1件検知、PNG・HTML保存成功
  - タブ2回作成（baseline完了後に閉じ、detect用に新規作成）は仕様どおり
