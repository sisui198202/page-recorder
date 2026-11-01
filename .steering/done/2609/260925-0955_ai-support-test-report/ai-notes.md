# AI Notes

## 現在の実行状況

- ユーザーは初回AI判断サポートファイルのダウンロード成功を確認済み。
- 実ファイルには基準取得までしか含まれず、`[WARN]`が警告欄に分類されないことを確認した。
- 実行結果を永続セッションに記録し、停止時に1件だけ出力する実装へ更新した。`npm test -- --runInBand` は316件成功。
- `resulttest`で `AI_Support_20260925_100827_shop.md` をレビュー。`expired`、基準取得、PNG/HTML保存は成功したが、検知シナリオと1実行1ファイルは未確認のため判定は要確認。
- 複数URL監視はURLごとに永続セッションを生成するため、AI判断サポートもURLごとの終端時1ファイルとして扱う。複数ファイルは開始グループIDで関連付ける。
- Phase 3の単体テストは `npm test -- --runInBand` で318件成功。Chromeでの複数URL ON/OFF とURLごとの出力は未確認。
- 2026-09-25のCHOCOLATE複数URL監視では、同じ実行IDが`startHighFrequencySession`と`contentScriptReady`の双方から実行され、変更証跡2組・同名AIサポート2件を生成した。content scriptの世代キーとbackgroundの結果メッセージ排他で修正し、回帰テストは成功。Chrome再確認は未実施。
- `resulttest`で開始グループ`startAll_1790305770950_n8valv`をレビュー。CHOCOLATEは検知工程・PNG/HTML・AIサポート各1件で二重生成解消を確認したが、Nissanは`detected`終了にもかかわらず検知工程・証跡が欠落しており、レポート保存の競合が残るため要修正。
- 検知工程の追記と終端保存が別Storageスナップショットで競合しても出力本文を欠損させないため、検知直後のレポートを終端処理へ明示的に引き渡すよう修正した。単体テストで工程・PNG/HTML保持を確認し、ChromeでのNissan再確認は未実施。
- `resulttest`で開始グループ`startAll_1790306453306_qjxv3p`を再レビュー。Nissan・CHOCOLATEともに検知工程1回、PNG/HTML各1件、`detected`終端、URLごとのAIサポート1件を確認し、二重生成とNissanの欠落は解消した。OFF時の非出力のみ未確認。
- ユーザーが複数URL監視のAI判断サポートをOFFにした実行で、AIサポートMarkdownが生成されないことを確認した。Phase 3のON/OFF手動確認は完了。
- 2026-09-25: AI判断サポートファイル設定をON/OFF直後にpopupを閉じて再表示し、選択状態が維持されることを確認した。

## 手動テスト連携メモ

- 実装後は、時間切れとキーワード検知の両方でレポートが1件だけ生成されることを確認する。
- 確認時は、終了理由・工程結果・PNG/HTMLの要求ファイル名・downloadIdがレポートと一致することも確認する。
- 複数URL監視では、共通UIをONにしてURLごとに1件ずつ出力されること、OFFでは出力されないこと、同一開始グループID・各設定ID/名称・終了理由がファイル名と本文にあることを確認する。
- `resulttest` は `rules/resulttest-rule.md` とClaude正本Skillを使い、最新レポートを受け入れ条件と照合して記録する。
