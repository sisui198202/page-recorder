# decisions.md

## 🎯 目的

設計・実装における重要な判断を記録する。

---

## 📝 判断記録

### 判断#1: 保存パスは `download/` ルート維持 + サブフォルダ整理

* **日付**: 2026-06-01
* **カテゴリ**: データ構造
* **採用**: `download/aeon/stock/{yyMMdd}/` + `baseline_` / `detected_` + `yyMMdd-hhmmss`（**年2桁 yy**）
* **理由**: PRD の `download/` 慣習を維持しつつ、日次・種別で整理。baseline と detected を同一フォルダで比較可能にする。

### 判断#2: popup「スクリーンショット」と非連動

* **日付**: 2026-06-01
* **採用**: 定時 baseline は常に PNG / HTML / txt を保存
* **理由**: 運用上、定時監視の証跡は popup 一般設定に依存させない。

---

## 🧠 原則・方針

* 定時監視の差分検知本体（`.steering/260529-aeon-stock-watch-window/`）の挙動を壊さない
* 定時 baseline 用は **専用関数**（`executeBaselineDownload` への直接委譲はしない）

---

## 📚 参考資料

* `.steering/260529-aeon-stock-watch-window/requirements.md`
* `tests/aeon-scheduled-stock-check-sw-manual.md`
