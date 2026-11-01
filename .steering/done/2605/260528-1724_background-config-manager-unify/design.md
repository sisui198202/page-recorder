# 🎯 概要

requirements.md を満たすための
**具体的な実装方法（How）を定義する**

---

# 🧠 設計方針

- 設定の read/write/migrate を **単一I/O層**に集約し、キー分裂・状態不一致の再発条件（複数I/O経路の併存）を除去する
- 外部APIの破壊を避けるため、`background.js` 側に存在する `configManager` は **互換Facade**として残し、内部はすべて `MonitoringConfigManager` に委譲する
- 既存データのフィールド正規化（例: `detection_mode/keyword/selector`）は本タスクの主目的ではないため、**本タスクでは実行しない**（別タスク化）

---

# 🧩 対応要件マッピング（最重要）

requirements.md の機能要件と必ず対応付ける

- 要件: 設定の永続化（read/write）は単一管理層に集約
  - 対応: `chrome.storage.local.get/set/remove` による監視設定I/Oは `MonitoringConfigManager` に集約する（`background.js` 内の `loadConfig/saveConfig/migrateStorageKeys` を廃止/経路遮断）
- 要件: 旧キー→新キー移行を冪等に実行
  - 対応: 起動時に `MonitoringConfigManager.initialize()` を **1箇所**で実行し、その中で `migrateStorageKey()` を実施する（`background.js` 側の移行ロジックは削除/無効化）
- 要件: `configManager` 相当が存在する場合でも内部委譲
  - 対応: `background.js` の `configManager` は互換Facadeとして残し、全メソッドを `monitoringConfigManager`（`MonitoringConfigManager` インスタンス）へ委譲する

🚨 すべての要件に対応必須
🚨 未対応要件がある場合は実装禁止

---

# 🗂 変更対象

## 新規作成

- （なし）

## 修正対象

- `/src/background/background.js`
- `/src/background/monitoringConfigManager.js`

## 変更なし（確認済）

- （なし）

---

# 🧩 変更内容

## 対象コンポーネント（概念）

- `MonitoringConfigManager`（監視設定I/O・移行・バリデーション）
- `background.js` 内 `configManager`（互換Facade）
- `background.js` 内 legacy 設定I/O（`currentConfig/loadConfig/saveConfig/migrateStorageKeys` など）※廃止対象

---

## データ構造変更

### 変更前

```json
{
  "monitoringConfig": {},
  "monitoring_config": {}
}
```

### 変更後

```json
{
  "monitoring_config": {}
}
```

---

# 🔄 処理フロー

```mermaid
graph TD
startup[Startup] --> ensureMCM[EnsureMonitoringConfigManager]
ensureMCM --> migrateKeys[MCM.migrateStorageKey()]
migrateKeys --> ready[Ready]

caller[Caller(configManagerAPI)] --> facade[configManagerFacade]
facade --> mcm[MCM.load/save/changeMode/add/remove/update/getStatus/import/export]
mcm --> storage[chrome.storage.local("monitoring_config")]
```

---

# 🧩 データ構造

## 入力

```json
{
  "storage": {
    "monitoringConfig": "旧キー（存在する可能性）",
    "monitoring_config": "新キー（正）"
  }
}
```

## 出力

```json
{
  "storage": {
    "monitoring_config": "単一キーに集約された設定"
  }
}
```

---

# 🧩 Chrome拡張連携（該当時のみ使用）

> Chrome拡張（content/background/popup）が関わる場合のみ記載

## content script

* 役割:
* 実行条件:
* 対象ページ:

---

## background script

* 役割:
* 入出力:

---

## popup / options

* 操作起点:
* 表示内容:

---

## メッセージ連携

| 送信元   | 送信先     | 内容   |
| ----- | ------- | ---- |
| popup | content | 実行指示 |

---

# 📦 API / 外部連携（該当時のみ使用）

* 入力
* 出力
* 変更点

---

# ⚠️ 影響範囲

- 関連機能: 監視設定のロード/保存、モード切替、監視対象の追加/更新/削除、Excel Import/Export（利用している場合）
- 関連ファイル: `/src/background/background.js`, `/src/background/monitoringConfigManager.js`
- UIへの影響: 直接は想定しないが、設定が安定して反映されることで挙動が改善する可能性がある

---

# 🧪 テスト方針

## 手動テスト

- 旧キーのみ/新キーのみ/両方 のストレージ状態から起動し、`monitoring_config` に集約されること
- モード切替・監視対象追加/更新/削除が、常に単一ソース（`monitoring_config`）を参照して反映されること
- Excel Import/Export（利用箇所がある場合）が統一後も動作すること

---

## 自動テスト（必要に応じて）

- （現時点では必須化しない。必要性が出た場合は別途検討）

---

# 🚧 リスクと対策

- リスク: 移行ロジックの重複により、起動時に意図しない上書きが起きる
  - 対策: 移行・I/Oを `MonitoringConfigManager.initialize()` に集約し、`background.js` 側の移行/保存経路を削除する
- リスク: `configManager` の互換APIが暗黙に `currentConfig` を前提にしている箇所が残る
  - 対策: `configManager` の各メソッドは MCM 委譲に統一し、`currentConfig` 参照は段階的に排除する

---

# 🔀 代替案

- 案A: 呼び出し元も含めて `configManager` を全面置換し、MCM 直呼びに統一
  - 採否: ❌（今回は採用しない）
  - 理由: 影響範囲が大きく、段階移行の安全性が下がるため
- 案B: `configManager` は互換Facadeとして残し、内部実装のみを MCM に統一
  - 採否: ✅（採用）
  - 理由: 外部API互換を維持しつつ、I/O単一化で根本原因（複数経路）を除去できるため

---

# ❓ 未確定事項

- なし（requirements承認後の方針として確定）

---

# 📝 decisions.md記録対象

- 互換Facadeを残す判断と理由
- 正規化（フィールド統一）を別タスクに切り出す判断
- 移行・I/O集約の到達点（I/Oの唯一化）と、将来的な `configManager` 削除可否

---

# 📝 承認

* [x] ユーザー承認済み

---

# 🚨 実装ルール（最重要）

* 本design.mdに記載された内容のみ実装可能
* 未記載仕様の実装は禁止
* 不明点は requirements / decisions に戻る

---

# 🎯 最終原則

👉 requirementsを100%満たす
👉 実装方法を曖昧にしない
👉 DOMは必ず検証する（該当時）
👉 迷ったら実装しない

---
