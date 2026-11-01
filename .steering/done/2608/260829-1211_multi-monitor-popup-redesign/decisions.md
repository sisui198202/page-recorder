# decisions — multi-monitor-popup-redesign

## 初期判断

- 2026-08-29 時点では、`複数URL監視` を主導線に戻す方針のみを確定事項として扱う
- `単一URL監視 + EC監視サイト + 監視URL登録` は補助導線として扱う
- 詳細な UI 配置や制御粒度は `design.md` で確定する

## PRD同期メモ

### 今すぐ直せる事実

- `PRD/system-role-definition.md` のタイトルと本文中の製品名は、現リポジトリ名 `PageRecorder` に合わせて更新候補とする
- `PRD/system-role-definition.md` の `非対応パターン` にある `I | 複数サイト監視は SummaryMoniterが担当` は、`plan/todo.md` で `対応パターン: I` として扱っている現状と衝突している
- `PRD/system-role-definition.md` の `将来拡張の余地` にある `新商品URL自動取得 | ❌ 未実装` は、2026-08-25 に実装済みのため事実更新対象とする
- `PRD/system-role-definition.md` の `複数サイト一括監視UI改善` は、`複数URL監視UI主導線化` として再定義された現行計画に合わせて名称と説明の見直し対象とする

### design確定後に反映する項目

- `複数URL監視` を popup のどの位置で初期表示にするか
- `監視対象リスト` `全体制御` `📊 設定管理` をどう見せ分けるか
- `単一URL監視` を補助導線としてどう案内するか
- `一括開始 / 一括停止 / サマリー表示 / 監視対象リスト強化` の最終仕様
