# design.md

> 🔍 非公開リポジトリに「公開版を書き出すスクリプト」と公開用 README・LICENSE を置き、追跡ファイルだけを別フォルダへコピーしながらパス・クライアントIDを置換し、最後に公開前チェックで残りが無いことを確かめる。

## 🎯 概要

requirements.md（R0〜R7）を満たすための実装方法を定義する。公開版は非公開リポジトリから毎回書き出して作る。非公開リポジトリの履歴・作業記録は書き換えない。

---

## 🛠 技術スタック

- 書き出しスクリプト: Bash（macOS 標準の `bash`・`rsync`・`perl`・`grep`・`git`）
- 拡張機能本体: Manifest V3（変更なし）
- テスト: Jest（既存）

---

## 🧠 設計方針

- **書き出し方式**: 一度きりの手作業コピーではなく、再実行できるスクリプトにする。PageRecorder は開発を続けるため、公開版を更新するたびに同じ手順で安全に作り直せるようにする
- **対象は Git の追跡ファイルだけ**: `git ls-files` を元にコピーする。`client_secret_*.json` や `node_modules/` など追跡外のファイルは、仕組み上コピーされない
- **置換は公開版のコピーだけに行う**: 非公開リポジトリの `.steering/done/`・`docs/実装済/` は履歴保管領域のため書き換えない
- **最後に必ず検査する**: 置換漏れ・秘密情報・個人情報が1件でも見つかったら、スクリプトは失敗で終わる

---

## 🧩 対応要件マッピング

| 要件 | 対応方法 |
| ---- | -------- |
| R0 公開用の新リポジトリ | スクリプトが `~/Work/Projects/PageRecorder-public/` に追跡ファイルを書き出す。履歴は持ち込まない。`git init`・GitHub 作成・push はユーザーが行う（README に手順を書く） |
| R1 ローカルパスの置換 | 書き出し後のテキストファイルで ホームディレクトリの絶対パス（`$HOME/`）を `~/` に置換する |
| R2 クライアントIDの置換 | 書き出し後のテキストファイルで `数字-英数字.apps.googleusercontent.com` の形を `YOUR_CLIENT_ID.apps.googleusercontent.com` に置換する。公開版 README に設定手順を書く |
| R3 閲覧者向け README | `publish/README.public.md` を新規作成し、書き出し時に公開版の `README.md` として置く |
| R3-2 表現の言い換え | `publish/README.public.md` は「Webページの変化検知・記録・通知」として書く。先着検知・自動カート連携の記述は入れない |
| R4 MIT LICENSE | `publish/LICENSE` を新規作成し、書き出し時に公開版のルートへ置く |
| R5 公開前チェック | スクリプトの最後で公開版を検査し、件数を表示する。0件でなければ失敗で終わる |
| R6 含めるフォルダ | 追跡ファイルを原則すべて含める（`.steering/`・`docs/`・`plan/`・`download/`・`.claude/`・`scripts/` を含む） |
| R7 購入フロー系資料の除外 | 除外リスト（下記）に一致するファイルはコピーしない |

---

## 🗂 変更対象

### 新規作成（非公開リポジトリ）

- `scripts/export-public.sh` … 公開版の書き出し・置換・検査
- `publish/README.public.md` … 公開版の README
- `publish/LICENSE` … MIT ライセンス本文
- `tests/docs/公開版エクスポートの手動テスト手順.md` … 書き出しの確認手順

### 修正対象（非公開リポジトリ）

- `tests/unit/scheduled-watch-ui-contract.test.js` … リポジトリ外のファイル（`~/Work/automation/_data/stock_watch_snippets*.json`）を読むテスト1件を、そのファイルが無い環境ではスキップする。公開版でテストが失敗しないようにするため。ファイルがある環境では今までどおり実行する
- `scripts/README.md` … `export-public.sh` の使い方を追記
- `plan/todo.md`、本タスクの `.steering/` … タスク管理

### 変更なし（確認済み）

- `src/` 配下すべて、`manifest.json`（非公開版は今のクライアントIDのまま）

---

## 🧩 除外リスト（公開版にコピーしないもの）

| パターン | 理由 |
|----------|------|
| `参考/**` | 購入フロー対応表（買い占めを連想させる資料、R7） |
| `**/*.pdf` | Markdown から生成した派生物。中に古いローカルパスが含まれうるが、PDF の中身は置換できない |
| `publish/**` | 公開版 README・LICENSE の元ファイル（書き出し先では README.md・LICENSE として置く） |

`PRD/system-role-definition.md` など、購入フローに数行触れているファイルは残す（作業記録・設計資料の中の記述は残す、という要件6の決定に従う）。

---

## 🧩 書き出しスクリプトの処理（`scripts/export-public.sh`）

```text
入力: 書き出し先（省略時 $HOME/Work/Projects/PageRecorder-public）
1. 実行場所が PageRecorder リポジトリのルートであることを確認する
2. 書き出し先を用意する（無ければ作る。あれば .git と node_modules 以外を入れ替える）
3. git ls-files の一覧から除外リストに一致するものを除き、rsync で書き出し先へコピーする
4. 書き出し先の README.md を publish/README.public.md で置き換え、LICENSE を置く
5. 書き出し先のテキストファイルに置換をかける
   - $HOME/ → ~/
   - [0-9]{8,}-[a-z0-9]{20,}.apps.googleusercontent.com → YOUR_CLIENT_ID.apps.googleusercontent.com
6. 公開前チェック（書き出し先が対象）
   - ローカルパス（ユーザーディレクトリ配下の絶対パス）を含むファイル数
   - Google クライアントIDの形を含むファイル数
   - 個人メールアドレス（gmail/yahoo/icloud/outlook）を含むファイル数
   - Discord Webhook URL を含むファイル数
   - client_secret / credentials / .env という名前のファイル数
   → 件数を表示し、どれか1件でもあれば exit 1
7. 書き出したファイル数と、次にやること（npm ci → npm test、git init など）を表示する
```

- スクリプト自身にはホームディレクトリの絶対パスを直接書かない（既定の書き出し先は `$HOME` から作る）
- ファイルの中身（秘密情報の値）は表示しない。表示するのはファイル名と件数だけ

---

## 🧩 公開版 README の構成（`publish/README.public.md`）

1. 1行の説明（Webページの変化を検知・記録・通知する Chrome 拡張機能）
2. このプロジェクトについて（作者が自分の業務のために作ったこと、解決した課題、確認作業を約7割削減した成果）
3. 主な機能（ページの HTML・スクリーンショット保存、キーワード監視、`chrome.alarms` による定時チェック、差分検知、Chrome 通知・Gmail API 通知、設定のバックアップ）
4. 構成（Manifest V3 の Service Worker・popup・storage・alarms の関係を Mermaid の図で示す）
5. テスト（Jest、テストファイル数、`npm test` の実行方法）
6. 開発の進め方（PRD → requirements → design → tasks の流れ、`.steering/` の見方、Claude Code・Codex などの生成AIの使い方）
7. セットアップ（拡張機能の読み込み方、OAuth クライアントIDの設定手順）
8. ライセンス（MIT）

テスト数などの数字は、書き出し時点の実数を確認して書く。

---

## 🧪 テスト方針

### 自動テスト

- 非公開リポジトリで `npm test` が通る（修正したテストを含む）
- 公開版で `npm ci --legacy-peer-deps` → `npm test` が通る（リポジトリ外ファイルを読むテストはスキップされる）。`jest-chrome@0.8.0` の peer dependency（jest 26〜27）と jest 29 が衝突するため `--legacy-peer-deps` が必要（実装中に判明、D-003）

### 手動テスト（`tests/docs/公開版エクスポートの手動テスト手順.md`）

- スクリプトを実行し、公開前チェックが全項目0件で終わる
- 公開版の `manifest.json` の client_id が `YOUR_CLIENT_ID` になっている
- 公開版に `参考/` と PDF が無い
- 公開版の README・LICENSE が置き換わっている
- 非公開リポジトリの `git status` に、意図した変更以外が出ていない（スクリプトが非公開側を書き換えていない）
- 公開版を Chrome で「パッケージ化されていない拡張機能」として読み込み、popup が開く（Gmail 通知は client_id が無いため動かない前提）

---

## 🚧 リスクと対策

| リスク | 対策 |
| ------ | ---- |
| 置換漏れ（別の書き方のパスやID） | スクリプト最後の検査で検出し、失敗で終わらせる |
| 置換で壊れるファイル（バイナリ） | 置換は `grep -I` でテキストと判定したファイルだけに行う |
| `~/` に置換したパスを使うスクリプトが公開版で動かない | `scripts/sync-stock-fetch-diagnosis-samples.js` などは作者の環境専用のため許容し、公開版 README に「作者環境向けの補助スクリプト」と書く |
| 書き出し先の誤指定で別フォルダを消す | 書き出し先に `.pagerecorder-public` という目印ファイルが無い既存の空でないフォルダには書き込まず、失敗で終わる |

---

## 🔀 代替案

| 案 | 内容 | 採否 | 理由 |
| --- | ---- | ---- | ---- |
| A | 非公開リポジトリのファイルを直接書き換え、履歴を消して公開 | ❌ | 履歴保管領域を書き換えることになり、開発用の記録も失う |
| B | 手作業で1回だけコピーして整える | ❌ | 開発を続けるたびに同じ作業と確認が必要になる |
| C | 書き出しスクリプトで毎回作る | ✅ | 再実行でき、検査も毎回自動で行える |

---

## ❓ 未確定事項

- なし（LICENSE の著作権者表記は `sisui198202` に決定、2026-11-01）

---

## 📝 decisions.md 記録対象

- D-001: 公開版は書き出しスクリプトで作る（代替案 A・B を却下した理由）
- D-002: PDF を公開版から除外する理由

---

## 📝 承認

- [x] ユーザー承認済み（2026-11-01）

---

## 🚨 実装ルール（最重要）

- 本 design.md に記載された内容のみ実装可能
- 未記載仕様の実装は禁止
- 不明点は requirements / decisions に戻る
