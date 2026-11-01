# Index - PageRecorder

プロジェクト全体のファイル・ディレクトリ索引

---

## ルートディレクトリ

| ファイル | 役割 |
|---------|------|
| `manifest.json` | Chrome拡張マニフェスト（v1.8.0, Manifest V3） |
| `package.json` | npm パッケージ定義 |
| `CLAUDE.md` | Claude Code設定・開発ルール |
| `README.md` | プロジェクト概要 |
| `QUICK_START.md` | クイックスタートガイド |
| `Index.md` | 本ファイル（プロジェクト索引） |
| `.gitignore` | Git除外設定 |

---

## ソースコード (src/)

### バックグラウンド処理 (src/background/)

| ファイル | 責務 |
|---------|------|
| `background.js` | Service Workerメイン処理。監視制御・イベント管理 |
| `monitoringConfigManager.js` | 監視設定専用管理モジュール |
| `lib/stock-helpers.js` | 純粋関数群。時刻整形・差分判定・CSVパース・ファイル名生成 |

### コンテンツスクリプト (src/content/)

| ファイル | 責務 |
|---------|------|
| `content.js` | ページ内処理。系統A向け DOM 状態取得 |

### ポップアップUI (src/ui/)

| ファイル | 責務 |
|---------|------|
| `popup.html` | ポップアップUIマークアップ |
| `popup.js` | ポップアップ制御・ユーザー操作処理 |

### ライブラリ (src/lib/)

| ファイル | 用途 |
|---------|------|
| `xlsx.full.min.js` | Excel操作ライブラリ |

---

## PRD/ - Product Requirements Document

新しい6ファイル構成でプロジェクト要件・設計を管理。

| ファイル | 内容 | 参照タイミング |
|---------|------|---------------|
| `product-requirements.md` | BDD形式要件定義 | 開発前の仕様確認 |
| `functional-design.md` | 機能設計・データモデル・UI設計 | コーディング前の設計確認 |
| `architecture.md` | システムアーキテクチャ・技術スタック | アーキテクチャ理解 |
| `development-guidelines.md` | 開発ルール・テスト戦略・コーディング規約 | 開発時の参考 |
| `glossary.md` | 用語定義 | 用語確認 |
| `repository-structure.md` | ファイル配置ガイド | ファイル追加時の参考 |

---

## docs/ - ドキュメント

### ガイドライン (docs/guidelines/)

開発時の参考資料・ガイドライン。

### 設定例 (docs/examples/)

サイト設定の具体例・分析ドキュメント。

| ファイル | 内容 |
|---------|------|
| `サイト設定例集.md` | サイト設定の具体例集 |

### テンプレート (docs/templates/)

新規ファイル作成用のテンプレート。

### テスト関連 (docs/testing/)

テスト手順・報告書。

### 学習用 (docs/study/)

コード学習・理解のための資料。

### 画像 (docs/images/)

ドキュメント用画像ファイル。

---

## TODO/ - タスク管理

| パス | 内容 |
|-----|------|
| `TODO.md` | TODOリスト |
| `PLAN.md` | 実装計画（レベル2戦術） |
| `tasks/active/` | 進行中タスク |
| `tasks/completed/` | 完了タスクアーカイブ |

---

## scripts/ - ユーティリティスクリプト

| ファイル | 用途 |
|---------|------|
| `create-todo.sh` | TODO作成自動化 |
| その他 | 開発支援スクリプト |

---

## icons/ - 拡張機能アイコン

| ファイル | サイズ |
|---------|-------|
| `icon16.png` | 16x16px |
| `icon48.png` | 48x48px |
| `icon128.png` | 128x128px |

---

## download/ - 出力ファイル

監視・取得結果の保存先。

| ファイル形式 | 内容 |
|-------------|------|
| `PageSource_*.html` | 取得したページソース |
| `Screenshot_*.png` | 取得したスクリーンショット |

---

## その他のディレクトリ

| ディレクトリ | 内容 |
|-------------|------|
| `.claude/` | Claude Code設定・ルールファイル |
| `.serena/` | Serena設定 |
| `.steering/` | ステアリング設定 |
| `backup/` | バックアップファイル |
| `node_modules/` | npm依存パッケージ（git除外） |
| `tests/` | テストファイル |

---

## クイックナビゲーション

### よく参照するファイル

- **開発ルール**: [CLAUDE.md](CLAUDE.md)
- **要件定義**: [PRD/product-requirements.md](PRD/product-requirements.md)
- **機能設計**: [PRD/functional-design.md](PRD/functional-design.md)
- **アーキテクチャ**: [PRD/architecture.md](PRD/architecture.md)
- **タスク管理**: [TODO/TODO.md](TODO/TODO.md)
- **設定例**: [docs/examples/サイト設定例集.md](docs/examples/サイト設定例集.md)

### ソースコード

- **バックグラウンド**: [src/background/background.js](src/background/background.js)
- **コンテンツスクリプト**: [src/content/content.js](src/content/content.js)
- **ポップアップUI**: [src/ui/popup.html](src/ui/popup.html)

---

**最終更新**: 2026-05-25
