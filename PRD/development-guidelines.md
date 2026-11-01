# Development Guidelines - PageRecorder

## 概要

本ドキュメントでは、`PageRecorder` の現行開発フロー、テスト方針、コーディング上の注意、ドキュメント更新基準を定義する。

---

## 1. 開発ワークフロー

### 1.1 判断順序

開発時の判断順序は次のとおり。

```text
PRD -> steering -> code
```

- `PRD/`: 現在の仕様・設計・構造の正本
- `.steering/<task>/`: 実装タスク単位の要求・設計・進行管理
- `code`: 最終的な実装対象

### 1.2 計画と実装の流れ

現行のタスク運用は `plan/` と `.steering/` を前提とする。

```text
PRD（事実・仕様）
  ↓
plan/docs（未完了の改善計画・背景整理）
  ↓
plan/todo.md（今やる候補）
  ↓
/newtask {タスク名}
  ↓
.steering/<task>/
  - requirements.md
  - design.md
  - tasks.md
  - ai-notes.md
  ↓
実装・確認
  ↓
docs/実装済/ または .steering/done/
```

### 1.3 `.steering/` 文書の参照順

```text
requirements.md > design.md > tasks.md > ai-notes.md
```

- `requirements.md`: 何を満たすか
- `design.md`: どう実装するか
- `tasks.md`: Phase 単位の進行管理
- `ai-notes.md`: 実務知見、手動テスト報告、close 前引き継ぎ

`ai-notes.md` は仕様正本ではない。仕様変更や判断理由の確定は `requirements.md` `design.md` `decisions.md` 側で扱う。

### 1.4 実装時の基本ルール

- 作業前に `PRD/`、`plan/todo.md`、`.steering/README.md`、関連する `tests/docs/` を確認する
- 実装は `tasks.md` の Phase 単位で進める
- 完了済みタスクは `docs/実装済/` と `.steering/done/` で管理する
- 別テーマを進行中 task に無断で混在させない

---

## 2. テスト戦略

### 2.1 テスト種別

| 種別 | 主な手段 | 対象 | 実行タイミング |
| --- | --- | --- | --- |
| ユニットテスト | Jest | 純粋関数、設定変換、UI ロジックの特性 | 実装中随時 |
| 手動テスト | `tests/docs/` の手順書 | Chrome 拡張連携、Service Worker、監視導線 | 機能完了時・回帰確認時 |

このリポジトリでは、自動テストに加えて手動回帰確認を前提とする。

### 2.2 テスト実行コマンド

```bash
# 全テスト
npm test

# unit テストのみ
npm run test:unit

# watch 実行
npm run test:watch

# カバレッジ
npm run test:coverage
```

### 2.3 テスト関連ディレクトリ

```text
tests/
├── unit/      # Jest によるユニットテスト
├── helpers/   # テスト補助コード
├── docs/      # 手動テスト手順
└── setup.js   # Jest セットアップ
```

### 2.4 確認の考え方

- 実装しただけでは完了としない
- 内容確認、挙動確認、差分確認、連携確認も「確認」に含む
- popup、background、content、offscreen の連携変更では手動確認観点を残す

---

## 3. コーディング規約

### 3.1 命名

| 対象 | 規則 | 例 |
| --- | --- | --- |
| ディレクトリ | kebab-case | `tests/docs/` |
| JavaScript ファイル | camelCase | `monitoringConfigManager.js` |
| Markdown ファイル | kebab-case | `development-guidelines.md` |
| 設定ファイル | 標準名 | `manifest.json` |

### 3.2 コーディングスタイル

```javascript
const monitoringInterval = 30;

function startMonitoring() {}
function getStoredConfig() {}

class MonitoringService {}

const MAX_RETRY_COUNT = 3;
```

- 既存パターンを優先し、局所修正で済むなら大きく作り替えない
- 変更は依頼範囲に絞り、無関係な整形や広域リファクタは避ける

### 3.3 コメント規則

- コメントは必要最小限にし、処理の意図や前提だけを書く
- 自明な代入や逐語説明のコメントは避ける
- 用語説明を `〇〇とは` の形で追加・回答した場合は、`glossary.md` への追記要否も確認する

### 3.4 エラーハンドリングとログ

```javascript
try {
  await executeMonitoring();
} catch (error) {
  logger.error("monitoring failed", error);
  await notifyError(error);
}
```

- エラーは握りつぶさず、必要な通知または復旧処理につなげる
- `background` の新規ログは原則 `logger` / `bgLog*` 経由で出す
- `background` に生の `console.*` を新規追加しない

---

## 4. ドキュメント更新ルール

### 4.1 更新対象

| 変更内容 | 更新対象 |
| --- | --- |
| 仕様変更 | `PRD/product-requirements.md`, `PRD/functional-design.md` |
| 構成変更 | `PRD/architecture.md`, `PRD/repository-structure.md` |
| 開発運用変更 | `AGENTS.md`, `plan/README.md`, 必要に応じて本書 |
| 新用語追加 | `PRD/glossary.md` |
| 手動確認手順変更 | `tests/docs/` |

### 4.2 配置の原則

- `PRD/` には現在の仕様・事実を書く
- `plan/docs/` には未完了の改善計画や背景を書く
- `plan/todo.md` には今やる候補だけを書く
- `plan/docs/` を起点にした task は、実装・必要なテスト・`.steering/done/` への完了記録後に、対応計画書を `docs/実装済/` へ移す。未完了項目が混在する場合は完了部分を分離する

### 4.3 品質基準

- 最新のコードと一致している
- 初見の実装者が読んで次の行動を判断できる
- 実際の運用フローと矛盾しない
- 専門用語は `glossary.md` で定義できる状態にする

---

## 5. レビュー観点

- 要件と設計に沿っている
- 既存の監視ロジック、background I/O、外部拡張通知境界を崩していない
- 自動テストまたは手動確認観点が残っている
- ログ追加が project ルールに従っている
- ドキュメント更新漏れがない
