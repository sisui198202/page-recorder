# scripts

スケジュール監視のテスト・開発支援スクリプト集。

## sync-stock-fetch-diagnosis-samples.js

`~/Work/buy/Target` 配下の手動確認済み`site_capture`から、在庫あり・なしのFetch診断サンプルを同梱設定へ同期します。共有の`ec-sites.json`は変更しません。

```bash
node scripts/sync-stock-fetch-diagnosis-samples.js
```

`INITIAL_SITE_IDS`に登録したECサイトを同期対象にします。各`url.txt`の`url:`行（またはURL単独行）と任意の`title:`行を読み、状態・URLの重複を除外します。

同期対象の追加、`site_capture`の配置、生成結果の確認は[在庫Fetch診断のサイト追加手順](../docs/在庫Fetch診断_サイト追加手順.md)を参照してください。

---

## check-plan-todo.js

`plan/todo.md` に終端状態の項目が残っていないことを読み取り専用で確認するスクリプトです。`task-close` の plan 整理後、commit 前の最終ゲートとして実行します。

```bash
npm run check:plan-todo
```

成功条件は、`[ ]`（未着手）と `[~]`（進行中・未確認）のみが残っていることです。`[x]`（完了）、`[-]`（保留）、`[/]`（却下）がある場合は、行番号と整理案を表示して失敗します。

失敗した場合は、対応する記録を確認してから項目を削除します。

- `[x]`: `.steering/done/` の完了記録を確認し、対応する `plan/docs/` の計画書は `docs/実装済/` へ移す
- `[-]`: `.steering/on-hold/` に保留理由を記録する
- `[/]`: `decisions.md` などに却下理由を記録する

---

## export-public.sh

GitHub 公開用のコピーを書き出すスクリプトです。Git 追跡ファイルだけを書き出し先へコピーし、ローカルパスを `~/` に、OAuth クライアントIDを `YOUR_CLIENT_ID` に置き換えます。このリポジトリ自体は変更しません。

```bash
# 既定の書き出し先: $HOME/Work/Projects/PageRecorder-public
bash scripts/export-public.sh

# 書き出し先を指定する
bash scripts/export-public.sh ~/path/to/PageRecorder-public
```

- 除外するもの: `参考/`、`*.pdf`、`publish/`
- 公開版の `README.md`・`LICENSE` は `publish/README.public.md`・`publish/LICENSE` から置く
- 最後に公開前チェック（ローカルパス・クライアントID・個人メール・Discord Webhook・秘密情報らしいファイル名）を行い、1件でも見つかれば失敗で終わる
- 目印ファイル `.pagerecorder-public` の無い、空でないフォルダには書き込まない
- GitHub への公開（`git init`・リポジトリ作成・push）は行わない

確認手順は [公開版エクスポートの手動テスト手順](../tests/docs/公開版エクスポートの手動テスト手順.md) を参照してください。

---

## set-test-times.js

`scheduled-watch-sites.json` の `baselineTime` と `schedules` を現在時刻ベースで自動設定するスクリプト。

### 目的

- テスト時に毎回手動で時刻を編集する手間を省く
- 現在時刻から相対的に設定することで、即座にテスト開始できる

### 使い方

```bash
# 全サイトの時間を設定（baselineTime + schedules）
node scripts/set-test-times.js

# 特定サイトのみ設定
node scripts/set-test-times.js --site aeon-pokemon

# baselineTimeのみ設定（schedulesは変更しない）
node scripts/set-test-times.js --baseline-only

# 特定サイトのbaselineTimeのみ設定
node scripts/set-test-times.js --baseline-only --site aeon-pokemon
```

### 設定される時間

| 項目 | 時刻 |
|------|------|
| baselineTime | 現在 + 1分 |
| schedule 1 | 現在 + 2分 〜 + 3分（30秒間隔） |
| schedule 2 | 現在 + 4分 〜 + 6分（60秒間隔） |

### バックアップ・復元

```bash
# 現在の設定をバックアップ
node scripts/set-test-times.js --backup

# バックアップから復元
node scripts/set-test-times.js --restore
```

バックアップファイル: `src/config/scheduled-watch-sites.json.backup`

### サイト絞り込み

テスト対象を1サイトに限定したい場合に使用する。

```bash
# 指定サイトのみ enabled = true、他は全て false
node scripts/set-test-times.js --isolate aeon-pokemon

# 全サイトを enabled = true に戻す
node scripts/set-test-times.js --enable-all
```

### 典型的なテストフロー

```bash
# 1. 現在の設定をバックアップ
node scripts/set-test-times.js --backup

# 2. テスト対象サイトを絞り込み
node scripts/set-test-times.js --isolate aeon-pokemon

# 3. テスト時間を設定
node scripts/set-test-times.js --site aeon-pokemon

# 4. Chrome拡張をリロード

# 5. テスト実行（約1分後にbaseline、2分後に監視開始）

# 6. テスト完了後、設定を復元
node scripts/set-test-times.js --restore
```

### 注意事項

- スクリプト実行後は **Chrome拡張のリロードが必要**
- 設定変更前にバックアップを取ることを推奨
- `--isolate` は他サイトの `enabled` を `false` に変更するため、本番運用中は注意
