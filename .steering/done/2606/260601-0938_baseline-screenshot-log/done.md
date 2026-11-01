# done.md — baseline 取得時にスクショ＋ログを残す

## 完了情報

| 項目 | 内容 |
|------|------|
| 完了日時 | 2026-06-01 |
| 作業ブランチ | feature/baseline-screenshot-log |
| merge先 | main |
| commit hash | 90c9811 |
| 削除したブランチ | feature/baseline-screenshot-log (local + remote) |

---

## 変更概要

### 実装内容

1. **タイムスタンプ表示改善**
   - `formatJstTimestampReadable()` 関数を追加
   - 検知ログの timestamp を JST形式（`2026-06-01 12:51:24 (JST)`）で表示

2. **ベースラインストレージ永続化**
   - 初回ベースライン設定時に `persistStockSnapshot` を呼び出し
   - 監視停止後もベースラインがストレージに保存される

3. **ダウンロードファイル保存先**
   - `~/Downloads/aeon/stock/{yyMMdd}/`
   - baseline_{yyMMdd-hhmmss}.{png,html,txt}
   - detected_{yyMMdd-hhmmss}.txt

### 変更ファイル

- `src/background/background.js`
- `tests/aeon-scheduled-stock-check-sw-manual.md`
- `tests/memo.md`
- `tests/ベースライン時と検知時ダウンロードテスト方法.md` (新規)

---

## 手動テスト結果

- [x] baseline 3ファイル（png/html/txt）が1セット保存される
- [x] 2回目以降の tick では baseline ファイルが増えない
- [x] popup「スクリーンショット」OFF でも baseline 3ファイルが保存される
- [x] 差分検知時に detected_*.txt が同フォルダに保存される
- [x] 監視停止後も scheduledStockSnapshots にベースラインが残る
- [x] timestamp が JST 形式で表示される

---

## README/docs更新

- 今回の実装は内部機能のため README 更新は不要

---

## 残課題

なし
