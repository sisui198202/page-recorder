# Repository Structure - PageRecorder

## 概要

本ドキュメントでは、リポジトリのディレクトリ構造・ファイル配置ガイドを定義する。

---

## 1. ディレクトリ構成

```
PageRecorder/
├── CLAUDE.md              # Claude Code設定・ルール
├── README.md              # プロジェクト概要
├── manifest.json          # Chrome拡張マニフェスト
├── package.json           # npm パッケージ定義
├── .gitignore             # Git 除外設定
├── .cursorrules           # Cursor AI 設定
│
├── PRD/                   # Product Requirements Document
│   ├── product-requirements.md  # 要件定義（BDD形式）
│   ├── functional-design.md     # 機能設計
│   ├── architecture.md          # システムアーキテクチャ
│   ├── development-guidelines.md # 開発ガイドライン
│   ├── glossary.md              # 用語集
│   └── repository-structure.md  # リポジトリ構造（本ファイル）
│
├── src/                   # ソースコード
│   ├── background/        # Service Worker（バックグラウンド処理）
│   │   ├── background.js  # メイン監視制御
│   │   ├── monitoringConfigManager.js # 設定I/O集約
│   │   └── lib/           # 純粋関数・補助ロジック
│   │       └── stock-helpers.js
│   ├── content/           # Content Script（ページ内処理）
│   │   └── content.js     # 系統A向けDOM状態取得
│   ├── config/            # JSON設定
│   │   ├── ec-sites.json  # EC監視UI向けサイト定義
│   │   ├── scheduled-watch-sites.json
│   │   └── README.md
│   ├── offscreen/         # Blob保存補助
│   │   ├── offscreen.html
│   │   └── offscreen.js
│   ├── lib/               # 同梱ライブラリ
│   │   └── xlsx.full.min.js
│   └── ui/                # UI（ポップアップ）
│       ├── popup.html     # ポップアップHTML
│       └── popup.js       # ポップアップスクリプト
│
├── icons/                 # 拡張機能アイコン
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
│
├── docs/                  # 技術ドキュメント・ガイド
│   ├── 実装済/            # 完了した計画・実装記録
│   ├── mermeid/           # フロー図・構成図
│   ├── examples/          # 設定例・構造分析例
│   ├── pdf/               # 配布用PDF
│   └── images/            # 画像ファイル
│
├── tests/                 # テストファイル
│   ├── unit/              # ユニットテスト
│   ├── helpers/           # テスト補助
│   ├── docs/              # 手動テスト手順
│   └── setup.js           # テスト環境設定
│
├── plan/                  # 改善計画と起票候補
│   ├── README.md          # plan 配下の全体ルール
│   ├── todo.md            # 今やる候補
│   ├── docs/              # 未完了の改善計画・将来課題
│   └── pdf/               # plan 文書のPDF
│
├── .steering/             # /newtask で作るタスク単位の実行文書
│   ├── README.md          # .steering 運用入口
│   └── done/              # 完了済みタスクのアーカイブ
│
├── scripts/               # ユーティリティスクリプト
│   ├── set-test-times.js  # 定時監視テスト時刻の補助
│   └── README.md
│
├── download/              # ダウンロードされたファイル
│   ├── PageSource_*.html  # 取得ページソース
│   └── Screenshot_*.png   # スクリーンショット
│
└── backup/                # バックアップファイル
```

---

## 2. 重要ファイル・ディレクトリ説明

### 2.1 src/ - ソースコード

| パス | 責務 | 説明 |
|-----|------|------|
| `src/background/background.js` | 監視制御・イベント管理 | Service Workerメイン処理 |
| `src/background/monitoringConfigManager.js` | 設定保存・移行・Excel入出力 | 監視設定I/O集約 |
| `src/background/lib/stock-helpers.js` | 純粋関数群 | 時刻整形、差分判定、ファイル名生成など |
| `src/content/content.js` | DOM状態取得 | レガシー単一監視（系統A）の Content Script |
| `src/ui/popup.html` | UIマークアップ | ポップアップUI構造 |
| `src/ui/popup.js` | UI制御・ユーザー操作 | ポップアップJavaScript |

### 2.2 PRD/ - 要件・設計

| ファイル | 役割 | 参照タイミング |
|---------|------|--------------|
| `product-requirements.md` | BDD要件定義 | 開発前の仕様確認 |
| `functional-design.md` | 機能設計・データモデル | コーディング前の設計確認 |
| `architecture.md` | システム構成・技術選定 | アーキテクチャ理解 |
| `development-guidelines.md` | 開発ルール・テスト戦略 | 開発時の参考 |
| `glossary.md` | 用語定義 | 用語確認 |
| `repository-structure.md` | ファイル配置ガイド | ファイル追加時の参考 |

### 2.3 plan/ と .steering/ - 計画と実行

| パス | 内容 | 用途 |
|-----|------|------|
| `plan/README.md` | `plan/` 配下の全体ルール | `plan` 文書の置き場所・完了時整理の判断 |
| `plan/docs/README.md` | `plan/docs/` 内の補足ルール | 起票候補順・補足運用の確認 |
| `plan/todo.md` | 今やる候補 | 通常の `/newtask` 起点 |
| `plan/docs/` | 未完了の改善計画 | `plan/todo.md` を補完する背景・優先順の参照 |
| `.steering/<task>/requirements.md` | 要求整理 | 起点文書と理由の記録 |
| `.steering/<task>/design.md` | 実装設計 | 実装方針の具体化 |
| `.steering/<task>/tasks.md` | 実行タスク | Phase 単位の進行管理 |
| `.steering/<task>/ai-notes.md` | 実務知見メモ | 重要判断、不採用、手動テスト報告、close前引き継ぎの記録 |

### 2.4 docs/ - 技術ドキュメント

| パス | 内容 | 用途 |
|-----|------|------|
| `docs/実装済/` | 完了済みの計画・実装記録 | 履歴参照 |
| `docs/mermeid/` | フロー図・構成図 | 監視フロー理解 |
| `docs/examples/` | 設定例・構造分析例 | 設定作成・構造分析の参考 |
| `docs/images/` | 画像ファイル | UI説明・資料添付 |

### 2.5 tests/ - テストファイル

| パス | 内容 | 用途 |
|-----|------|------|
| `tests/unit/` | ユニットテスト | 個別関数の特性テスト |
| `tests/helpers/` | テスト補助 | ソース関数の抽出・評価 |
| `tests/setup.js` | Jest初期化 | `jest-chrome` セットアップ |
| `tests/docs/` | 手動テスト手順 | Service Worker / DL / 通知導線の検証手順 |

---

## 3. ファイル配置ガイド

### 3.1 新しいファイルを追加する場合

#### ソースコード
| 種類 | 配置先 |
|-----|--------|
| バックグラウンド処理 | `src/background/` |
| ページ内処理 | `src/content/` |
| UI関連 | `src/ui/` |
| ユーティリティ | `src/utils/`（作成時） |

#### テスト
| 種類 | 配置先 |
|-----|--------|
| ユニットテスト | `tests/unit/` |
| テスト補助 | `tests/helpers/` |
| 手動テスト手順 | `tests/docs/` |
| Jestセットアップ | `tests/setup.js` |

#### ドキュメント
| 種類 | 配置先 |
|-----|--------|
| 事実・要件・設計 | `PRD/` |
| 未完了の改善計画 | `plan/docs/` |
| 今やる候補 | `plan/todo.md` |
| 完了記録 | `docs/実装済/` |
| 手動テスト手順 | `tests/docs/` |

### 3.2 計画から実装までの流れ

```text
PRD/ または docs/ の事実
  -> plan/docs/ の改善計画
  -> plan/todo.md の起票候補
  -> /newtask
  -> .steering/<task>/
     - requirements.md
     - design.md
     - tasks.md
     - ai-notes.md
```

- 通常は `plan/todo.md` を起点に `/newtask` する
- `plan/docs/` から直接起票する場合は、起点文書と理由を `requirements.md` に残す
- `.steering/<task>/` の参照優先順位は `requirements.md > design.md > tasks.md > ai-notes.md`
- `decisions.md` は判断理由、`ai-notes.md` は実務知見、`done.md` は完了要約として責務を分ける
- 実装完了後は `plan/todo.md` と `plan/docs/` を整理する。`plan/docs/` を起点にした task は、必要なテストと `.steering/done/` への完了記録後に、対応計画書を `docs/実装済/` へ移す

### 3.3 ファイル命名規則

| 対象 | 規則 | 例 |
|-----|------|-----|
| ディレクトリ | kebab-case | `todo-tasks/` |
| JSファイル | camelCase | `backgroundService.js` |
| テストファイル | `*.test.js` or `*.spec.js` | `monitoring.test.js` |
| Markdownファイル | kebab-case | `development-guidelines.md` |

---

## 4. YAGNI原則

**空ディレクトリは作成しない**

- 実装予定のディレクトリは、実装時に初めて作成する
- テンプレート・プレースホルダーファイルは不要
- 実際に使用するファイルのみをコミットする

```
# 良い例: 実装時にディレクトリ作成
mkdir -p src/utils
touch src/utils/helpers.js

# 悪い例: 空ディレクトリを事前作成
mkdir -p src/utils  # 中身がないのにコミット
```

---

## 5. .gitignore 管理対象

```gitignore
# 依存関係
node_modules/

# ビルド成果物
dist/

# 環境設定
.env
.env.local

# IDE設定
.vscode/
.idea/

# OS生成ファイル
.DS_Store
Thumbs.db

# ダウンロードファイル（大量になる可能性）
download/

# バックアップ
backup/

# テストカバレッジ
coverage/
```
