# タスク: イオン在庫監視セレクター更新

## Phase 1: 設定と構造定義を更新する

- [x] 共有正本`ec-sites-master.json`のAeon `selectors.productPage`へ`pageRecorderMonitor`を追加する。
- [x] Targetの`aeon_site_structure`へ、同じ監視条件と状態別HTMLによる選定根拠を反映する。
- [x] 共有同期スクリプトを実行し、PageRecorderの`src/config/ec-sites.json`へ反映する。

## Phase 2: 自動検証を追加・実行する

- [x] `pageRecorderMonitor`がAeonの診断既定値として優先されるテストを追加する。
- [x] 保存済み診断成果物に対し、全3サンプルの一致数とキーワード判定を検証する。
- [x] 関連する自動テストを実行する。

## Phase 3: Chromeで受け入れ確認する

- [x] 拡張機能を再読み込みし、Aeonのみ有効で一括診断を実行する（2026-09-24）。
- [x] 3サンプルがすべて`FETCH_SUPPORTED`であることを確認する（2026-09-24）。
- [x] 手動確認結果と実装知見を`ai-notes.md`へ記録する。

## 承認

- [x] ユーザー承認済み（2026-09-24）
