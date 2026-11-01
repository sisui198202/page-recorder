# tasks.md

> 🔍 書き出しスクリプト・公開用 README / LICENSE・テストの移植性修正を実装し、公開版を書き出して検査・テスト・読み込み確認まで行う（GitHub への公開操作は含めない）。

詳細ルールは [tasks テンプレート README](~/Documents/Summary/11_テンプレート/40_タスク管理/README.md) を参照

- 起点台帳: `plan/todo.md`「GitHub公開準備：ローカルパスの置換、OAuthクライアントIDの扱い、閲覧者向けREADME追記（公開操作そのものは含めない）」
- 作業ブランチ: `feature/github-publish-prep`

---

<a id="status-rules"></a>
## ✅ チェック状態の定義

* [ ] 未着手。今回タスクで対応予定の項目
* [x] 実装済み。実装は完了したが、確認が未完了の項目
* [x] 完了。対象項目について、実装と確認の両方が完了した項目
* [-] 保留。このタスク内で今回対応しないが、再検討・対応余地がある個別項目
* [/] 却下。今回タスクでは不採用確定の項目

---

<a id="phase-1"></a>
# Phase 1: 事前確認

## 🧩 実装

* [x] requirements.md（R0〜R7）を確認する
* [x] design.md の変更対象・除外リスト・スクリプト処理を確認する
* [x] 変更前の基準として、非公開リポジトリで `npm test` を実行し結果を記録する
* [x] 変更前の公開前チェック件数（ローカルパス 27件、クライアントID 3件、PDF 6件）を ai-notes.md に記録する

## 🧪 手動テスト

* [x] `npm test` の変更前の結果（成功数・失敗数）を把握している

### このPhaseで確認とみなすもの

* 変更前のテスト結果と、置換・除外の対象件数が記録されている

---

<a id="phase-3"></a>
# Phase 3: 単体実装

## 🧩 実装

### 3-1. テストの移植性修正（R6 の公開版でテストを通すため）

* [x] `tests/unit/scheduled-watch-ui-contract.test.js` の「Alfred の正本と生成 JSON は C アラーム同期・状態確認を含む」を、`stock_watch_snippets.src.json` が無い環境ではスキップする形に変える

### 3-2. 公開用ファイル（R3・R3-2・R4）

* [x] `publish/README.public.md` を design の構成（1〜8）で作成する。先着検知・自動カート連携の表現は使わない。テスト数は実数を数えて書く
* [x] `publish/LICENSE` に MIT ライセンス本文を作成する（著作権者表記は `sisui198202`）

### 3-3. 書き出しスクリプト（R0・R1・R2・R5・R6・R7）

* [x] `scripts/export-public.sh` を design の処理 1〜7 で作成する
  * [x] 実行場所の確認、書き出し先の目印ファイル（`.pagerecorder-public`）による誤上書き防止
  * [x] `git ls-files` ＋除外リスト（`参考/**`・`**/*.pdf`・`publish/**`）での rsync コピー
  * [x] README.md の差し替えと LICENSE の配置
  * [x] `$HOME/` → `~/`、クライアントID → `YOUR_CLIENT_ID` の置換（`grep -I` でテキストのみ）
  * [x] 公開前チェック5項目の件数表示と、1件でもあれば exit 1
  * [x] スクリプト内にホームディレクトリの絶対パスを直接書かない
* [x] `scripts/README.md` に `export-public.sh` の使い方を追記する
* [x] `tests/docs/公開版エクスポートの手動テスト手順.md` を作成する（目的・実行・期待結果、成功条件と保証範囲・失敗境界を含める）

## 🧪 手動テスト

* [x] 非公開リポジトリで `npm test` が成功する（3-1 の修正後。ファイルがある環境では該当テストが実行される）
* [x] `bash -n scripts/export-public.sh` で構文エラーが無い
* [x] `grep -c "$HOME" scripts/export-public.sh` が0件
* [x] 目印ファイルの無い既存フォルダを書き出し先に指定すると、書き込まずに失敗で終わる

### このPhaseで確認とみなすもの

* 追加・修正したファイルが design の記載どおりで、非公開リポジトリのテストが通る
* スクリプトが誤ったフォルダを書き換えない

---

<a id="phase-5"></a>
# Phase 5: Chrome拡張連携確認

## 🧩 実装

* [x] 公開版（`~/Work/Projects/PageRecorder-public`）を Chrome に「パッケージ化されていない拡張機能」として読み込む手順を手動テスト手順書に沿って用意する

## 🧪 手動テスト

* [x] 公開版を読み込んだとき、manifest エラーが出ずに拡張機能が読み込まれる（ユーザー確認）
* [x] 公開版の popup が開く（Gmail 通知は client_id が無いため動作しない前提）（ユーザー確認）

### このPhaseで確認とみなすもの

* client_id をプレースホルダーにした公開版でも、拡張機能として読み込めて popup が開く

---

<a id="phase-6"></a>
# Phase 6: 統合確認

## 🧩 実装

* [x] `scripts/export-public.sh` を実行し、`~/Work/Projects/PageRecorder-public` に公開版を書き出す
* [x] 公開版で `npm ci --legacy-peer-deps` → `npm test` を実行する（D-003）
* [x] decisions.md に D-001（書き出しスクリプト方式）、D-002（PDF 除外）、D-003（--legacy-peer-deps）を記録する
* [x] docs 更新要否を確認する（`scripts/README.md` と手動テスト手順書のみ更新。README.md・QUICK_START.md・PRD は利用者向けの挙動が変わらないため更新不要）

## 🧪 手動テスト

* [x] 公開前チェック5項目がすべて0件で、スクリプトが成功で終わる
* [x] 公開版の `manifest.json` の client_id が `YOUR_CLIENT_ID.apps.googleusercontent.com` になっている
* [x] 公開版に `参考/` と `.pdf` が無く、`README.md` と `LICENSE` が置き換わっている
* [x] 公開版で `npm test` が成功する（リポジトリ外ファイルを読むテストはスキップ）
* [x] 非公開リポジトリの `git status --short` に、本タスクで意図した変更以外が無い（スクリプトが非公開側を書き換えていない）

### このPhaseで確認とみなすもの

* 公開版が要件（R0〜R7）を満たし、テストが通り、非公開リポジトリに副作用が無い

---

<a id="phase-7"></a>
# Phase 7: 仕上げ

## 🧩 実装

* [x] tasks.md の完了状態を最終確認する
* [x] design.md・requirements.md と実装の差分が無いことを確認する
* [x] ai-notes.md の「現在の実行状況」を更新する
* [x] 公開版 README の内容をユーザーに確認してもらう

## 🧪 手動テスト

* [x] 受け入れ条件（requirements.md）をすべて満たしている
* [x] ユーザーが公開版 README の内容を承認している

### このPhaseで確認とみなすもの

* `tasks.md` に `[ ]` `[~]` が残っていない
* GitHub への公開（`git init`・リポジトリ作成・push）はユーザーが行える状態になっている

---

<a id="notes"></a>
## 🔍 差分・課題メモ

* 2026-11-01 ユーザー確認: 公開版 README の内容は OK。タスク記録内の転職活動に関する記述は中立な表現に言い換えた（公開版にも反映し、該当語が無いことを確認）

* 2026-11-01 手動確認: 公開版はツールバーのアイコンが透明に見える。アイコンファイル（16/48/128）は非公開版とバイト一致・全ピクセル不透明、manifest の参照も正しく、setIcon 等の動的変更なし。→ その後ユーザーが Chrome のツールバーで緑のアイコンが表示されることを確認し、解消（表示中のページ・ブラウザの状態によるものと判断）

* 実装中に判明: `perl -0` の NUL 終端で PDF 除外が効いていなかった → 修正（D-002 備考）
* 実装中に判明: `npm ci` が jest-chrome の peer dependency で失敗 → 手順に `--legacy-peer-deps` を追加（D-003）
* 公開前チェックが本タスクの steering 内のパス表記（パターンの説明文）を検出 → 表記を言い換えて解消

* Phase 2（DOM検証）・Phase 4（動的DOM確認）は、DOM 操作を伴わないため削除した
* GitHub への公開操作は requirements のスコープ外。ユーザーの明示指示があるまで行わない

---

<a id="completion-criteria"></a>
## 📝 完了条件

* [x] design.md に記載された今回対象範囲をすべて実装済み
* [x] 各Phaseの実装・確認について、対象項目は完了済み
* [x] 今回対応しない項目は `[-]` または `[/]` として整理済み
* [x] `tasks.md` と実装・確認状態が一致している
* [x] 未解決事項は decisions.md または未確定事項に反映済み
* [x] ユーザー確認済み
