# Requirements: PageRecorder 保存処理の共有API統一

## 背景

PageRecorder は独自の `downloadWithFilename` 関数でファイル保存を行っているが、共有ライブラリ `FileSave` が導入された。現在、即座取得（handleQuickCaptureMessage）のみ FileSave を使用しており、他の保存処理は旧実装のまま。

## 目的

PageRecorder の全保存処理を共有 `FileSave` API に統一し、コードの重複を解消する。

## 対象範囲

### 統一対象

1. **監視系保存**
   - 単一URL監視の検知保存
   - 複数URL監視の検知保存
   - 定時監視の検知保存

2. **AI判断サポート**
   - AI判断サポートファイル出力
   - 診断結果保存

3. **その他**
   - テストログ出力
   - デバッグ用保存

### 対象外

- 即座取得（handleQuickCaptureMessage）- 既に FileSave 統合済み

## 要件

### 機能要件

- [ ] `downloadWithFilename` の全呼び出しを `FileSave` に置換
- [ ] 既存のファイル名・保存先・動作を維持
- [ ] エラーハンドリングを FileSaveError に統一

### 非機能要件

- [ ] 既存テストが通ること
- [ ] 手動確認で既存動作に問題がないこと

## 追加要件: 複数URL監視の定時開始

### 背景

複数URL監視（A）は Popup UI で対象と共通監視条件を登録できる一方、毎日の開始時刻は設定できない。そのため、実運用と同じ定時開始を Popup だけで手動確認できない。

### 要件

- [x] A の共通設定に「定時監視を有効化」と毎日の開始時刻を追加する
- [x] 有効時は、指定時刻に有効な `multiple_configs` を既存の通常複数URL監視として開始する
- [x] 監視間隔・取得期間・検知・保存設定は、既存の `multiple_common_settings` をそのまま使用する
- [x] A 用アラームは B/C のアラームと分離し、B/C の予約・実行へ影響しない
- [x] Popup に予約状態・次回実行時刻を表示し、手動の「全て開始」は引き続き利用可能にする

## 追加要件: C通常経路の保存付き差分テスト

- [ ] テストタブから、選択したCサイトの基準保存・強制差分・検知保存を短時間で確認できる
- [ ] テスト専用アラームを経由し、基準PNG・HTML・TXT、検知PNG・HTMLの実ダウンロードを確認できる
- [ ] Gmail・Chrome通知・外部拡張通知・検知URL展開、本番baselineおよび通常Cセッションへ影響しない

## 参照

- 共有ライブラリタスク: `.steering/done/2610/261006-0845_shared-file-save-download/`
- FileSave 実装: `shared/lib/file/file-save.js`
