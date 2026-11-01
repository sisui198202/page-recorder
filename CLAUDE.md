# 🎯 概要

本ファイルは、PageRecorder で常時有効にしたい最重要のローカル原則を定義する。

---

## 共通ルール

- 本拡張機能は `chromeExtensions/CLAUDE.md` の共通ルールに従う
- クロス拡張タスク・共有リソース管理については親ディレクトリの `CLAUDE.md` を参照する
- 設計なき実装禁止・推測による仕様確定禁止の正本は `~/.claude/CLAUDE.md` を参照する
- タスク開始・tasks 具体化・完了処理は `~/.claude/rules/01_development/` と対応 skill を参照する
- ログ出力を変更する場合は repo ローカルの `.claude/rules/logging.md` を先に確認し、背景説明は `docs/ログ表記ガイド.md` を参照する

---

## EC共通設定管理

- DOM セレクタの正本: `buy/Target/{サイト名}/yaml/`
- URL・スケジュールの正本: `buy-target-config/sites/{siteId}/urls.yaml`
- scheduled-watch-sites.json は sync-buy-urls.js で urls.yaml から生成される配布コピー
- セレクタ実装時は `chromeExtensions/.claude/rules/ec-handler-selector-source-rule.md` を参照

---

# 🚨 最重要原則

```
PRD > steering > code
requirements → design → tasks → 実装
```

---

## この拡張で守ること

- `PRD > steering > code` を常に優先する
- `requirements → design → tasks → 実装` の順を崩さない
- PRD と矛盾する実装は禁止
- 監視ロジック、background I/O、外部拡張への通知境界を崩さない
- `background` の新規ログは原則 `logger` / `bgLog*` を使い、生 `console.*` を増やさない
- 実装は `tasks.md` にある Phase 単位で進める
- 変更は必ず意図を持つ

---

# 🚫 禁止事項

- PRD / steering に存在しない内容の実装
- ユーザー未承認の設計変更
- 状態不一致（`tasks.md` と実装のズレ）

---

# ⚡ 例外原則

以下は「本実装ではない」場合のみ許可：
- 技術検証（PoC）、DOM調査、バグ再現、簡易動作確認

**条件**: 本実装に含めない。結果を design または decisions に反映する。

---

# 📁 ドキュメント構造

詳細は `PRD/repository-structure.md` を参照。

- `PRD/`: プロジェクト全体の設計・要件
- `.steering/`: タスク単位の計画・設計・進捗
- `plan/`: 計画・改善管理
- `docs/実装済/`: 完了した計画・実装メモ

---

# 🧠 判断優先順位

迷った場合は必ず以下に従う：

```
1. PRD
2. steering（requirements / design / tasks）
3. code
```

---

# 🚀 最終原則

👉 PRD が常に正
👉 不明点は止まる（進めない）
👉 変更は必ず意図を持つ
