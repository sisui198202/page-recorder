# 実装済み: EC監視UI強化

## 完了日

2026-08-27

## 概要

`PageRecorder` の popup に、`src/config/ec-sites.json` を使う EC監視UI を追加した。サイト単位の ON/OFF、単一選択時の監視条件自動補完、サイト紐づけ URL 登録を popup 完結で扱えるようにし、`background.js` の監視ロジック境界は維持した。

## 実装内容

- `manifest.json` の `web_accessible_resources` に `src/config/ec-sites.json` を追加
- `src/ui/popup.js` に `loadEcSites()`、サイトトグル描画、単一選択時の自動補完、URL登録一覧/削除処理を追加
- `src/ui/popup.html` に `EC監視サイト`、`監視URL登録`、単一監視設定の再配置、およびインライン `<style>` を追加
- `src/config/ec-sites.json` を同梱し、popup から `chrome.runtime.getURL()` 経由で読める状態にした
- `README.md`、`plan/todo.md`、`plan/docs/` を完了状態に合わせて更新した

## 確認内容

- popup で EC サイト一覧が表示されること
- サイト ON/OFF 状態が `chrome.storage.local` に保存されること
- 単一サイト ON 時に `monitorSelector` / `monitorKeyword` が自動補完されること
- URL 登録、重複防止、削除が動作すること
- 既存の単一URL監視モード、設定保存/読込、定時差分検知 UI と共存すること

## 関連資料

- `.steering/done/2608/260826-0814_ec-monitoring-ui-enhancement/`
- `plan/todo.md`
- `docs/実装済/missing-features-roadmap.md`
- `README.md`

## 残課題

- `複数サイト一括監視UI改善` は別タスクとして完了済み（2026-09-05）
- `src/background/background.js` 側の 2026-08-27 時点の検知改善は本タスクに含めない
